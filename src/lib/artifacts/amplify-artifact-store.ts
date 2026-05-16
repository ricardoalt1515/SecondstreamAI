import { generateServerClientUsingCookies } from "@aws-amplify/adapter-nextjs/api";
import { nanoid } from "nanoid";
import { cookies } from "next/headers";
import { assertAmplifyOutputsConfigured } from "@/config/amplify-runtime";
import type { OwnerContext } from "@/lib/auth/owner-context";
import type { Schema } from "../../../amplify/data/resource";
import outputs from "../../../amplify_outputs.json";
import {
  type ArtifactKind,
  type ArtifactRecord,
  type ArtifactStore,
  assertArtifactKind,
  type PutArtifactInput,
} from "./artifact-store";

const client = generateServerClientUsingCookies<Schema>({ config: outputs, cookies });

type AmplifyListResult<T> = Promise<{ data: T[]; errors?: unknown[] }>;
type AmplifyModelResult<T> = Promise<{ data: T | null; errors?: unknown[] }>;
type ArtifactRow = Record<string, unknown> & { id: string };
type AmplifyArtifactClient = {
  create(input: Record<string, unknown>): AmplifyModelResult<ArtifactRow>;
  update(input: Record<string, unknown>): AmplifyModelResult<ArtifactRow>;
  list(input?: Record<string, unknown>): AmplifyListResult<ArtifactRow>;
};
type AmplifyDataClient = {
  models: {
    Artifact: AmplifyArtifactClient;
  };
};

const assertNoAmplifyErrors = <T>(
  operation: string,
  result: { data: T; errors?: unknown[] },
): T => {
  if (result.errors?.length) {
    throw new Error(`${operation} failed: ${JSON.stringify(result.errors)}`);
  }
  return result.data;
};

const toArtifactRecord = (row: ArtifactRow): ArtifactRecord => ({
  id: String(row.id),
  ownerUserId: String(row.userId ?? row.ownerUserId ?? ""),
  ownerIdentityId: String(row.ownerIdentityId ?? row.userId ?? ""),
  threadId: String(row.threadId),
  kind: assertArtifactKind(String(row.kind)),
  status: row.status === "failed" ? "failed" : "ready",
  title: String(row.title ?? "Artifact"),
  customerSlug: typeof row.customerSlug === "string" ? row.customerSlug : null,
  payloadVersion: Number(row.payloadVersion ?? 1),
  payload: row.payload,
  createdAtIso: String(row.createdAtIso ?? row.createdAt ?? new Date().toISOString()),
  updatedAtIso: String(
    row.updatedAtIso ?? row.updatedAt ?? row.createdAtIso ?? new Date().toISOString(),
  ),
});

export class AmplifyArtifactStore implements ArtifactStore {
  private readonly dataClient: AmplifyDataClient;
  private readonly idFactory: () => string;
  private readonly now: () => Date;

  constructor(
    dataClient?: AmplifyDataClient,
    options: { idFactory?: () => string; now?: () => Date } = {},
  ) {
    if (!dataClient) {
      assertAmplifyOutputsConfigured();
    }
    this.dataClient = dataClient ?? (client as unknown as AmplifyDataClient);
    this.idFactory = options.idFactory ?? nanoid;
    this.now = options.now ?? (() => new Date());
  }

  async putArtifact(input: PutArtifactInput, owner: OwnerContext): Promise<ArtifactRecord> {
    const kind = assertArtifactKind(input.kind);
    const existing =
      input.status === "ready" ? await this.getActiveArtifact(input.threadId, kind, owner) : null;
    const timestamp = this.now().toISOString();
    const payload = {
      customerSlug: input.customerSlug ?? null,
      kind,
      payload: input.payload,
      payloadVersion: input.payloadVersion,
      status: input.status,
      threadId: input.threadId,
      title: input.title,
      updatedAtIso: timestamp,
      userId: owner.userId,
    };

    const result = existing
      ? await this.dataClient.models.Artifact.update({
          id: existing.id,
          ...payload,
          createdAtIso: existing.createdAtIso,
        })
      : await this.dataClient.models.Artifact.create({
          id: this.idFactory(),
          ...payload,
          createdAtIso: timestamp,
        });

    const row = assertNoAmplifyErrors("Artifact.put", result);
    if (!row) {
      throw new Error("Artifact.put failed: no record returned");
    }
    return toArtifactRecord(row);
  }

  async getActiveArtifact(
    threadId: string,
    kind: ArtifactKind,
    owner: OwnerContext,
  ): Promise<ArtifactRecord | null> {
    const result = await this.dataClient.models.Artifact.list({
      filter: {
        kind: { eq: kind },
        status: { eq: "ready" },
        threadId: { eq: threadId },
        userId: { eq: owner.userId },
      },
    });
    const rows = assertNoAmplifyErrors("Artifact.list", result);
    const [latest] = rows
      .map(toArtifactRecord)
      .sort((a, b) => b.updatedAtIso.localeCompare(a.updatedAtIso));
    return latest ?? null;
  }

  async listArtifactsByThread(threadId: string, owner: OwnerContext): Promise<ArtifactRecord[]> {
    const result = await this.dataClient.models.Artifact.list({
      filter: {
        threadId: { eq: threadId },
        userId: { eq: owner.userId },
      },
    });
    const rows = assertNoAmplifyErrors("Artifact.listByThread", result);
    return rows.map(toArtifactRecord).sort((a, b) => b.updatedAtIso.localeCompare(a.updatedAtIso));
  }
}

export const createAmplifyArtifactStore = (): ArtifactStore => new AmplifyArtifactStore();
