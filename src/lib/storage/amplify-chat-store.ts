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
type AmplifyOperationResult<T> = { data: T; errors?: unknown[] };
type MessageRecord = Record<string, unknown> & { id: string };
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
    Message: AmplifyModelClient<MessageRecord> & {
      listMessageBySessionId?: (input: { sessionId: string }) => AmplifyListResult<MessageRecord>;
    };
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

const parseStoredPayloadJson = (value: unknown): unknown => {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const assertNoAmplifyErrors = <T>(operation: string, result: AmplifyOperationResult<T>): T => {
  if (result.errors?.length) {
    throw new Error(`${operation} failed: ${JSON.stringify(result.errors)}`);
  }

  return result.data;
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
    const { messages, queryMode } = await this.listMessageRows(threadId);

    const orderedMessages = messages
      .slice()
      .sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0));
    const parsedMessages = orderedMessages
      .map((message) => parseStoredPayloadJson(message.payloadJson))
      .filter(isStoredUIMessage);

    console.info("[chat-store] get-thread-messages:result", {
      threadId,
      queryMode,
      rawCount: messages.length,
      parsedCount: parsedMessages.length,
      droppedCount: orderedMessages.length - parsedMessages.length,
    });

    return parsedMessages.map((message) => structuredClone(message));
  }

  async saveMessage(threadId: string, message: MyUIMessage): Promise<void> {
    const messages = await this.getThreadMessages(threadId);
    const result = await this.dataClient.models.Message.create({
      id: message.id,
      sessionId: threadId,
      position: messages.length,
      role: message.role,
      payloadJson: JSON.stringify(message),
    });
    const createdMessage = assertNoAmplifyErrors("Message.create", result);

    console.info("[chat-store] save-message:created", {
      threadId,
      messageId: message.id,
      role: message.role,
      created: Boolean(createdMessage),
    });

    await this.bumpUpdatedAt(threadId);
  }

  async createThread(id: string, resourceId: string, title?: string): Promise<StoredThread> {
    const result = await this.dataClient.models.Session.create({
      id,
      userId: resourceId,
      title: title ?? null,
    });
    const createdThread = assertNoAmplifyErrors("Session.create", result);

    return toThread(createdThread ?? { id, userId: resourceId, title });
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
    const { messages } = await this.listMessageRows(threadId);
    await Promise.all(
      messages.map((message) => this.dataClient.models.Message.delete({ id: message.id })),
    );
    await this.dataClient.models.Session.delete({ id: threadId });
  }

  async replaceAssistantMessageAfter(
    threadId: string,
    messageId: string,
    nextAssistantMessage: MyUIMessage,
  ): Promise<void> {
    const { messages } = await this.listMessageRows(threadId);
    const ordered = messages
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
        .map((message) => parseStoredPayloadJson(message.payloadJson))
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
          payloadJson: JSON.stringify(message),
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

  private async listMessageRows(
    threadId: string,
  ): Promise<{ messages: MessageRecord[]; queryMode: "secondary-index" | "filter-scan" }> {
    if (this.dataClient.models.Message.listMessageBySessionId) {
      const result = await this.dataClient.models.Message.listMessageBySessionId({
        sessionId: threadId,
      });
      return {
        messages: assertNoAmplifyErrors("Message.listMessageBySessionId", result),
        queryMode: "secondary-index",
      };
    }

    const result = await this.dataClient.models.Message.list({
      filter: { sessionId: { eq: threadId } },
    });

    return {
      messages: assertNoAmplifyErrors("Message.list", result),
      queryMode: "filter-scan",
    };
  }
}

export const createAmplifyChatStore = (): ChatStore => new AmplifyChatStore();
