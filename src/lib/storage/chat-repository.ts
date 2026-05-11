import type { OwnerContext } from "@/lib/auth/server";
import type { ChatStore } from "@/lib/storage/chat-store";

export type FileRecord = {
  id?: string;
  sessionId: string;
  messageId?: string | null;
  storagePath: string;
  filename?: string | null;
  mediaType: string;
  sizeBytes: number;
};

export type GeneratedOutputRecord = {
  id?: string;
  sessionId: string;
  messageId?: string | null;
  storagePath?: string | null;
  mediaType?: string | null;
  title?: string | null;
  metadataJson?: unknown;
};

export interface ChatRepository extends ChatStore {
  listFiles(sessionId: string, owner: OwnerContext): Promise<FileRecord[]>;
  saveGeneratedOutput(record: GeneratedOutputRecord, owner: OwnerContext): Promise<void>;
}
