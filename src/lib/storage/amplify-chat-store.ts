import { generateServerClientUsingCookies } from "@aws-amplify/adapter-nextjs/api";
import { nanoid } from "nanoid";
import { cookies } from "next/headers";
import { assertAmplifyOutputsConfigured } from "@/config/amplify-runtime";
import type { OwnerContext } from "@/lib/auth/server";
import type { FileRecord, GeneratedOutputRecord } from "@/lib/storage/chat-repository";
import type { ChatStore, StoredThread } from "@/lib/storage/chat-store";
import type { MyUIMessage } from "@/types/ui-message";
import type { Schema } from "../../../amplify/data/resource";
import outputs from "../../../amplify_outputs.json";

const client = generateServerClientUsingCookies<Schema>({ config: outputs, cookies });

type AmplifyModelResult<T> = Promise<{ data: T }>;
type AmplifyListResult<T> = Promise<{ data: T[] }>;
type AmplifyModelClient<T extends { id: string }> = {
  create(input: Record<string, unknown>): AmplifyModelResult<T | null>;
  get(input: { id: string }): AmplifyModelResult<T | null>;
  update(input: Record<string, unknown>): AmplifyModelResult<T | null>;
  delete(input: { id: string }): AmplifyModelResult<T | null>;
  list(input?: Record<string, unknown>): AmplifyListResult<T>;
};
type AmplifyDataClient = {
  models: {
    Session: AmplifyModelClient<Record<string, unknown> & { id: string }>;
    Message: AmplifyModelClient<Record<string, unknown> & { id: string }>;
    File: AmplifyModelClient<
      Record<string, unknown> & {
        id: string;
        sessionId: string;
        messageId: string;
        storagePath: string;
        filename: string;
        mediaType: string;
        sizeBytes: number;
      }
    >;
    GeneratedOutput: AmplifyModelClient<Record<string, unknown> & { id: string }>;
  };
};

const toThread = (session: Record<string, unknown>): StoredThread => ({
  id: String(session.id),
  resourceId: String(session.userId ?? session.owner ?? ""),
  title: typeof session.title === "string" ? session.title : null,
  createdAt: String(session.createdAt ?? new Date().toISOString()),
  updatedAt: String(session.updatedAt ?? session.createdAt ?? new Date().toISOString()),
});

const isStoredUIMessage = (value: unknown): value is MyUIMessage => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as { role?: unknown; parts?: unknown };
  return (
    (candidate.role === "user" || candidate.role === "assistant" || candidate.role === "system") &&
    Array.isArray(candidate.parts)
  );
};

export class AmplifyChatStore implements ChatStore {
  private readonly dataClient: AmplifyDataClient;

  constructor(dataClient?: AmplifyDataClient) {
    if (!dataClient) {
      assertAmplifyOutputsConfigured();
    }
    this.dataClient = dataClient ?? (client as unknown as AmplifyDataClient);
  }

  async getThreadMessages(threadId: string): Promise<MyUIMessage[]> {
    const result = await this.dataClient.models.Message.list({
      filter: { sessionId: { eq: threadId } },
    });

    return result.data
      .slice()
      .sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0))
      .map((message) => message.payloadJson)
      .filter(isStoredUIMessage)
      .map((message) => structuredClone(message));
  }

  async saveMessage(threadId: string, message: MyUIMessage): Promise<void> {
    const messages = await this.getThreadMessages(threadId);
    await this.dataClient.models.Message.create({
      id: message.id,
      sessionId: threadId,
      position: messages.length,
      role: message.role,
      payloadJson: message,
    });
    await this.bumpUpdatedAt(threadId);
  }

  async createThread(id: string, resourceId: string, title?: string): Promise<StoredThread> {
    const result = await this.dataClient.models.Session.create({
      id,
      userId: resourceId,
      title: title ?? null,
    });

    return toThread(result.data ?? { id, userId: resourceId, title });
  }

  async getThreadById(threadId: string): Promise<StoredThread | null> {
    const result = await this.dataClient.models.Session.get({ id: threadId });
    return result.data ? toThread(result.data) : null;
  }

  async updateThreadTitle(threadId: string, title: string): Promise<void> {
    await this.dataClient.models.Session.update({ id: threadId, title });
  }

  async listThreads(userId: string): Promise<StoredThread[]> {
    const result = await this.dataClient.models.Session.list({
      filter: { userId: { eq: userId } },
    });

    return result.data
      .map(toThread)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async deleteThread(threadId: string): Promise<void> {
    const messages = await this.dataClient.models.Message.list({
      filter: { sessionId: { eq: threadId } },
    });
    await Promise.all(
      messages.data.map((message) => this.dataClient.models.Message.delete({ id: message.id })),
    );
    await this.dataClient.models.Session.delete({ id: threadId });
  }

  async replaceAssistantMessageAfter(
    threadId: string,
    messageId: string,
    nextAssistantMessage: MyUIMessage,
  ): Promise<void> {
    const messages = await this.dataClient.models.Message.list({
      filter: { sessionId: { eq: threadId } },
    });
    const ordered = messages.data
      .slice()
      .sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0));
    const targetIndex = ordered.findIndex((message) => message.id === messageId);

    if (targetIndex === -1) {
      return;
    }

    await Promise.all(
      ordered.map((message) => this.dataClient.models.Message.delete({ id: message.id })),
    );
    const nextMessages = [
      ...ordered
        .slice(0, targetIndex)
        .map((message) => message.payloadJson)
        .filter(isStoredUIMessage),
      nextAssistantMessage,
    ];

    await Promise.all(
      nextMessages.map((message, position) =>
        this.dataClient.models.Message.create({
          id: message.id,
          sessionId: threadId,
          position,
          role: message.role,
          payloadJson: message,
        }),
      ),
    );
    await this.bumpUpdatedAt(threadId);
  }

  async cloneThread(
    sourceThreadId: string,
    resourceId: string,
    upToMessageId?: string,
  ): Promise<StoredThread> {
    const source = await this.getThreadById(sourceThreadId);
    if (!source) {
      throw new Error("Source thread not found");
    }

    const nextThread = await this.createThread(nanoid(), resourceId, source.title ?? undefined);
    const sourceMessages = await this.getThreadMessages(sourceThreadId);
    const targetIndex = upToMessageId
      ? sourceMessages.findIndex((message) => message.id === upToMessageId)
      : -1;
    const messagesToCopy =
      targetIndex === -1 ? sourceMessages : sourceMessages.slice(0, targetIndex + 1);

    for (const message of messagesToCopy) {
      await this.saveMessage(nextThread.id, message);
    }

    return nextThread;
  }

  async listFiles(sessionId: string, _owner: OwnerContext): Promise<FileRecord[]> {
    const result = await this.dataClient.models.File.list({
      filter: { sessionId: { eq: sessionId } },
    });
    return result.data.map((file) => ({
      id: file.id,
      sessionId: file.sessionId,
      messageId: file.messageId,
      storagePath: file.storagePath,
      filename: file.filename,
      mediaType: file.mediaType,
      sizeBytes: file.sizeBytes,
    }));
  }

  async saveGeneratedOutput(record: GeneratedOutputRecord, _owner: OwnerContext): Promise<void> {
    await this.dataClient.models.GeneratedOutput.create(record as never);
  }

  private async bumpUpdatedAt(threadId: string): Promise<void> {
    const current = await this.getThreadById(threadId);
    await this.dataClient.models.Session.update({ id: threadId, title: current?.title ?? null });
  }
}

export const createAmplifyChatStore = (): ChatStore => new AmplifyChatStore();
