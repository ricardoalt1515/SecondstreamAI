import { type Client, createClient } from "@libsql/client";
import { nanoid } from "nanoid";
import type { MyUIMessage } from "@/types/ui-message";

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

export type StoredThread = {
  id: string;
  resourceId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
};

export interface ChatStore {
  getThreadMessages(threadId: string): Promise<MyUIMessage[]>;
  saveMessage(threadId: string, message: MyUIMessage): Promise<void>;
  createThread(id: string, resourceId: string, title?: string): Promise<StoredThread>;
  getThreadById(threadId: string): Promise<StoredThread | null>;
  updateThreadTitle(threadId: string, title: string): Promise<void>;
  listThreads(userId: string): Promise<StoredThread[]>;
  deleteThread(threadId: string): Promise<void>;
  replaceAssistantMessageAfter(
    threadId: string,
    messageId: string,
    nextAssistantMessage: MyUIMessage,
  ): Promise<void>;
  cloneThread(
    sourceThreadId: string,
    resourceId: string,
    upToMessageId?: string,
  ): Promise<StoredThread>;
}

class InMemoryChatStore implements ChatStore {
  private readonly threads = new Map<string, StoredThread>();
  private readonly messagesByThread = new Map<string, MyUIMessage[]>();

  async getThreadMessages(threadId: string): Promise<MyUIMessage[]> {
    const messages = this.messagesByThread.get(threadId) ?? [];
    return messages.map((message) => structuredClone(message));
  }

  async saveMessage(threadId: string, message: MyUIMessage): Promise<void> {
    const previous = this.messagesByThread.get(threadId) ?? [];
    this.messagesByThread.set(threadId, [...previous, structuredClone(message)]);
    this.touchThread(threadId);
  }

  async createThread(id: string, resourceId: string, title?: string): Promise<StoredThread> {
    const now = new Date().toISOString();
    const thread: StoredThread = {
      id,
      resourceId,
      title: title ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.threads.set(id, thread);
    this.messagesByThread.set(id, this.messagesByThread.get(id) ?? []);
    return structuredClone(thread);
  }

  async getThreadById(threadId: string): Promise<StoredThread | null> {
    const thread = this.threads.get(threadId);
    return thread ? structuredClone(thread) : null;
  }

  async updateThreadTitle(threadId: string, title: string): Promise<void> {
    const thread = this.threads.get(threadId);
    if (!thread) return;

    thread.title = title;
    thread.updatedAt = new Date().toISOString();
    this.threads.set(threadId, thread);
  }

  async listThreads(userId: string): Promise<StoredThread[]> {
    return [...this.threads.values()]
      .filter((thread) => thread.resourceId === userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map((thread) => structuredClone(thread));
  }

  async deleteThread(threadId: string): Promise<void> {
    this.threads.delete(threadId);
    this.messagesByThread.delete(threadId);
  }

  async replaceAssistantMessageAfter(
    threadId: string,
    messageId: string,
    nextAssistantMessage: MyUIMessage,
  ): Promise<void> {
    const messages = this.messagesByThread.get(threadId) ?? [];
    const targetIndex = messages.findIndex((message) => message.id === messageId);

    if (targetIndex === -1) {
      return;
    }

    const next = [...messages.slice(0, targetIndex), structuredClone(nextAssistantMessage)];

    this.messagesByThread.set(threadId, next);
    this.touchThread(threadId);
  }

  async cloneThread(
    sourceThreadId: string,
    resourceId: string,
    upToMessageId?: string,
  ): Promise<StoredThread> {
    const source = this.threads.get(sourceThreadId);

    if (!source) {
      throw new Error("Source thread not found");
    }

    const clonedThread = await this.createThread(nanoid(), resourceId, source.title ?? undefined);
    const sourceMessages = this.messagesByThread.get(sourceThreadId) ?? [];

    const messagesToCopy =
      upToMessageId === undefined
        ? sourceMessages
        : (() => {
            const index = sourceMessages.findIndex((message) => message.id === upToMessageId);
            if (index === -1) {
              return sourceMessages;
            }

            return sourceMessages.slice(0, index + 1);
          })();

    this.messagesByThread.set(
      clonedThread.id,
      messagesToCopy.map((message) => structuredClone(message)),
    );

    return clonedThread;
  }

  private touchThread(threadId: string): void {
    const thread = this.threads.get(threadId);
    if (!thread) {
      return;
    }

    thread.updatedAt = new Date().toISOString();
    this.threads.set(threadId, thread);
  }
}

class LibsqlChatStore implements ChatStore {
  constructor(private readonly client: Client) {}

  async initialize(): Promise<void> {
    await this.client.batch(
      [
        `CREATE TABLE IF NOT EXISTS chat_threads (
          id TEXT PRIMARY KEY NOT NULL,
          resource_id TEXT NOT NULL,
          title TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS chat_messages (
          id TEXT PRIMARY KEY NOT NULL,
          thread_id TEXT NOT NULL,
          position INTEGER NOT NULL,
          payload_json TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (thread_id) REFERENCES chat_threads(id) ON DELETE CASCADE
        )`,
      ],
      "write",
    );
  }

  async getThreadMessages(threadId: string): Promise<MyUIMessage[]> {
    const result = await this.client.execute({
      sql: `SELECT payload_json FROM chat_messages WHERE thread_id = ? ORDER BY position ASC`,
      args: [threadId],
    });

    return result.rows
      .map((row) => JSON.parse(String(row.payload_json)) as unknown)
      .filter(isStoredUIMessage);
  }

  async saveMessage(threadId: string, message: MyUIMessage): Promise<void> {
    if (!isStoredUIMessage(message)) {
      throw new Error("Invalid chat message payload");
    }

    const result = await this.client.execute({
      sql: `SELECT COALESCE(MAX(position), -1) + 1 AS next_position FROM chat_messages WHERE thread_id = ?`,
      args: [threadId],
    });

    const nextPosition = Number(result.rows[0]?.next_position ?? 0);

    await this.client.execute({
      sql: `INSERT OR REPLACE INTO chat_messages (id, thread_id, position, payload_json, created_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [message.id, threadId, nextPosition, JSON.stringify(message), new Date().toISOString()],
    });

    await this.bumpUpdatedAt(threadId);
  }

  async createThread(id: string, resourceId: string, title?: string): Promise<StoredThread> {
    const now = new Date().toISOString();

    await this.client.execute({
      sql: `INSERT OR REPLACE INTO chat_threads (id, resource_id, title, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [id, resourceId, title ?? null, now, now],
    });

    return {
      id,
      resourceId,
      title: title ?? null,
      createdAt: now,
      updatedAt: now,
    };
  }

  async getThreadById(threadId: string): Promise<StoredThread | null> {
    const result = await this.client.execute({
      sql: `SELECT id, resource_id, title, created_at, updated_at FROM chat_threads WHERE id = ? LIMIT 1`,
      args: [threadId],
    });

    const row = result.rows[0];

    if (!row) {
      return null;
    }

    return {
      id: String(row.id),
      resourceId: String(row.resource_id),
      title: row.title ? String(row.title) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  async updateThreadTitle(threadId: string, title: string): Promise<void> {
    await this.client.execute({
      sql: `UPDATE chat_threads SET title = ?, updated_at = ? WHERE id = ?`,
      args: [title, new Date().toISOString(), threadId],
    });
  }

  async listThreads(userId: string): Promise<StoredThread[]> {
    const result = await this.client.execute({
      sql: `SELECT id, resource_id, title, created_at, updated_at
            FROM chat_threads
            WHERE resource_id = ?
            ORDER BY updated_at DESC`,
      args: [userId],
    });

    return result.rows.map((row) => ({
      id: String(row.id),
      resourceId: String(row.resource_id),
      title: row.title ? String(row.title) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    }));
  }

  async deleteThread(threadId: string): Promise<void> {
    await this.client.batch(
      [
        {
          sql: `DELETE FROM chat_messages WHERE thread_id = ?`,
          args: [threadId],
        },
        {
          sql: `DELETE FROM chat_threads WHERE id = ?`,
          args: [threadId],
        },
      ],
      "write",
    );
  }

  async replaceAssistantMessageAfter(
    threadId: string,
    messageId: string,
    nextAssistantMessage: MyUIMessage,
  ): Promise<void> {
    const messages = await this.getThreadMessages(threadId);
    const targetIndex = messages.findIndex((message) => message.id === messageId);

    if (targetIndex === -1) {
      return;
    }

    const nextMessages = [...messages.slice(0, targetIndex), nextAssistantMessage];

    await this.client.batch(
      [
        {
          sql: `DELETE FROM chat_messages WHERE thread_id = ?`,
          args: [threadId],
        },
        ...nextMessages.map((message, index) => ({
          sql: `INSERT INTO chat_messages (id, thread_id, position, payload_json, created_at)
                VALUES (?, ?, ?, ?, ?)`,
          args: [message.id, threadId, index, JSON.stringify(message), new Date().toISOString()],
        })),
      ],
      "write",
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

    const messagesToCopy =
      upToMessageId === undefined
        ? sourceMessages
        : (() => {
            const index = sourceMessages.findIndex((message) => message.id === upToMessageId);
            if (index === -1) {
              return sourceMessages;
            }

            return sourceMessages.slice(0, index + 1);
          })();

    for (const message of messagesToCopy) {
      await this.saveMessage(nextThread.id, message);
    }

    return nextThread;
  }

  private async bumpUpdatedAt(threadId: string): Promise<void> {
    await this.client.execute({
      sql: `UPDATE chat_threads SET updated_at = ? WHERE id = ?`,
      args: [new Date().toISOString(), threadId],
    });
  }
}

export const createInMemoryChatStore = (): ChatStore => new InMemoryChatStore();

let singletonStore: ChatStore | null = null;

const createDefaultStore = async (): Promise<ChatStore> => {
  if (process.env.CHAT_STORE_RUNTIME !== "libsql") {
    const { createAmplifyChatStore } = await import("@/lib/storage/amplify-chat-store");
    return createAmplifyChatStore();
  }

  const client = createClient({
    url: process.env.CHAT_STORE_DATABASE_URL ?? "file:./mastra.db",
  });

  const store = new LibsqlChatStore(client);
  await store.initialize();
  return store;
};

export const getChatStore = async (): Promise<ChatStore> => {
  if (singletonStore) {
    return singletonStore;
  }

  singletonStore = await createDefaultStore();
  return singletonStore;
};
