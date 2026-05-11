import { type Client, createClient } from "@libsql/client";
import type { WorkingMemory } from "@/config/working-memory";

export interface WorkingMemoryStore {
  get(resourceId: string): Promise<WorkingMemory | null>;
  set(resourceId: string, memory: WorkingMemory): Promise<void>;
}

class InMemoryWorkingMemoryStore implements WorkingMemoryStore {
  private readonly map = new Map<string, WorkingMemory>();

  async get(resourceId: string): Promise<WorkingMemory | null> {
    return this.map.get(resourceId) ?? null;
  }

  async set(resourceId: string, memory: WorkingMemory): Promise<void> {
    this.map.set(resourceId, structuredClone(memory));
  }
}

class LibsqlWorkingMemoryStore implements WorkingMemoryStore {
  constructor(private readonly client: Client) {}

  async initialize(): Promise<void> {
    await this.client.execute(`CREATE TABLE IF NOT EXISTS working_memory (
      resource_id TEXT PRIMARY KEY NOT NULL,
      payload_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);
  }

  async get(resourceId: string): Promise<WorkingMemory | null> {
    const result = await this.client.execute({
      sql: `SELECT payload_json FROM working_memory WHERE resource_id = ? LIMIT 1`,
      args: [resourceId],
    });

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return JSON.parse(String(row.payload_json)) as WorkingMemory;
  }

  async set(resourceId: string, memory: WorkingMemory): Promise<void> {
    await this.client.execute({
      sql: `INSERT OR REPLACE INTO working_memory (resource_id, payload_json, updated_at)
            VALUES (?, ?, ?)`,
      args: [resourceId, JSON.stringify(memory), new Date().toISOString()],
    });
  }
}

export const createInMemoryWorkingMemoryStore = (): WorkingMemoryStore =>
  new InMemoryWorkingMemoryStore();

let singletonStore: WorkingMemoryStore | null = null;

const createDefaultStore = async (): Promise<WorkingMemoryStore> => {
  const client = createClient({
    url: process.env.CHAT_STORE_DATABASE_URL ?? "file:./mastra.db",
  });

  const store = new LibsqlWorkingMemoryStore(client);
  await store.initialize();
  return store;
};

export const getWorkingMemoryStore = async (): Promise<WorkingMemoryStore> => {
  if (singletonStore) {
    return singletonStore;
  }

  singletonStore = await createDefaultStore();
  return singletonStore;
};
