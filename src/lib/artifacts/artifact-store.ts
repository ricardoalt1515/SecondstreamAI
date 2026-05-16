import { nanoid } from "nanoid";
import type { OwnerContext } from "@/lib/auth/owner-context";

export const ARTIFACT_KINDS = [
  "field-brief",
  "playbook",
  "analytical-read",
  "proposal-shell",
] as const;

export type ArtifactKind = (typeof ARTIFACT_KINDS)[number];
export type ArtifactStatus = "ready" | "failed";

export type ArtifactRecord = {
  id: string;
  ownerUserId: string;
  ownerIdentityId: string;
  threadId: string;
  kind: ArtifactKind;
  status: ArtifactStatus;
  title: string;
  customerSlug?: string | null;
  payloadVersion: number;
  payload: unknown;
  createdAtIso: string;
  updatedAtIso: string;
};

export type PutArtifactInput = {
  threadId: string;
  kind: ArtifactKind;
  status: ArtifactStatus;
  title: string;
  customerSlug?: string | null;
  payloadVersion: number;
  payload: unknown;
};

export interface ArtifactStore {
  putArtifact(input: PutArtifactInput, owner: OwnerContext): Promise<ArtifactRecord>;
  getActiveArtifact(
    threadId: string,
    kind: ArtifactKind,
    owner: OwnerContext,
  ): Promise<ArtifactRecord | null>;
  listArtifactsByThread(threadId: string, owner: OwnerContext): Promise<ArtifactRecord[]>;
}

export const isArtifactKind = (value: string): value is ArtifactKind =>
  (ARTIFACT_KINDS as readonly string[]).includes(value);

export const assertArtifactKind = (value: string): ArtifactKind => {
  if (!isArtifactKind(value)) {
    throw new Error(`Invalid artifact kind: ${value}`);
  }
  return value;
};

type InMemoryArtifactStoreOptions = {
  idFactory?: () => string;
  now?: () => Date;
};

const activeKey = (ownerUserId: string, threadId: string, kind: ArtifactKind): string =>
  `${ownerUserId}:${threadId}:${kind}`;

export const createInMemoryArtifactStore = ({
  idFactory = nanoid,
  now = () => new Date(),
}: InMemoryArtifactStoreOptions = {}): ArtifactStore => {
  const records = new Map<string, ArtifactRecord>();
  const activeIds = new Map<string, string>();

  return {
    async putArtifact(input, owner) {
      const kind = assertArtifactKind(input.kind);
      const timestamp = now().toISOString();
      const key = activeKey(owner.userId, input.threadId, kind);
      const existingId = activeIds.get(key);
      const existing = input.status === "ready" && existingId ? records.get(existingId) : null;
      const record: ArtifactRecord = {
        id: existing?.id ?? idFactory(),
        ownerIdentityId: owner.identityId,
        ownerUserId: owner.userId,
        threadId: input.threadId,
        kind,
        status: input.status,
        title: input.title,
        customerSlug: input.customerSlug ?? null,
        payloadVersion: input.payloadVersion,
        payload: structuredClone(input.payload),
        createdAtIso: existing?.createdAtIso ?? timestamp,
        updatedAtIso: timestamp,
      };

      records.set(record.id, record);
      if (record.status === "ready") {
        activeIds.set(key, record.id);
      }
      return structuredClone(record);
    },

    async getActiveArtifact(threadId, kind, owner) {
      const artifactKind = assertArtifactKind(kind);
      const id = activeIds.get(activeKey(owner.userId, threadId, artifactKind));
      const record = id ? records.get(id) : null;
      return record?.status === "ready" ? structuredClone(record) : null;
    },

    async listArtifactsByThread(threadId, owner) {
      return [...records.values()]
        .filter((record) => record.threadId === threadId && record.ownerUserId === owner.userId)
        .sort((a, b) => b.updatedAtIso.localeCompare(a.updatedAtIso))
        .map((record) => structuredClone(record));
    },
  };
};
