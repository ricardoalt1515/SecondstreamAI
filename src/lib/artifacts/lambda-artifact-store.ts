import {
  DynamoDBClient,
  type DynamoDBClientConfig,
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { nanoid } from "nanoid";
import type { OwnerContext } from "@/lib/auth/owner-context";
import {
  type ArtifactKind,
  type ArtifactRecord,
  type ArtifactStore,
  assertArtifactKind,
  type PutArtifactInput,
} from "./artifact-store";

export type LambdaDynamoDbArtifactClient = Pick<DynamoDBClient, "send">;

export type LambdaDynamoDbArtifactStoreConfig = {
  client: LambdaDynamoDbArtifactClient;
  artifactTableName: string;
  now?: () => Date;
  idFactory?: () => string;
};

export type LambdaDynamoDbArtifactStoreEnv = {
  LAMBDA_CHAT_ARTIFACT_TABLE_NAME?: string;
  AWS_REGION?: string;
};

type ArtifactItem = {
  id: string;
  userId: string;
  ownerIdentityId?: string;
  threadId: string;
  kind: string;
  status: "ready" | "failed";
  title: string;
  customerSlug?: string | null;
  payloadVersion: number;
  payload: unknown;
  createdAt: string;
  createdAtIso: string;
  updatedAt: string;
  updatedAtIso: string;
  owner?: string;
  __typename?: "Artifact";
};

const activeId = (owner: OwnerContext, threadId: string, kind: ArtifactKind): string =>
  `${owner.userId}#${threadId}#${kind}`;

const appSyncOwner = (userId: string): string => `${userId}::${userId}`;

const toRecord = (item: ArtifactItem): ArtifactRecord => ({
  id: item.id,
  ownerIdentityId: item.ownerIdentityId ?? "",
  ownerUserId: item.userId,
  threadId: item.threadId,
  kind: assertArtifactKind(item.kind),
  status: item.status,
  title: item.title,
  customerSlug: item.customerSlug ?? null,
  payloadVersion: Number(item.payloadVersion),
  payload: item.payload,
  createdAtIso: item.createdAtIso,
  updatedAtIso: item.updatedAtIso,
});

export class LambdaDynamoDbArtifactStore implements ArtifactStore {
  private readonly client: LambdaDynamoDbArtifactClient;
  private readonly tableName: string;
  private readonly now: () => Date;
  private readonly idFactory: () => string;

  constructor(config: LambdaDynamoDbArtifactStoreConfig) {
    this.client = config.client;
    this.tableName = config.artifactTableName;
    this.now = config.now ?? (() => new Date());
    this.idFactory = config.idFactory ?? nanoid;
  }

  async putArtifact(input: PutArtifactInput, owner: OwnerContext): Promise<ArtifactRecord> {
    const kind = assertArtifactKind(input.kind);
    const timestamp = this.now().toISOString();
    const id = input.status === "ready" ? activeId(owner, input.threadId, kind) : this.idFactory();
    const item: ArtifactItem = {
      __typename: "Artifact",
      createdAt: timestamp,
      createdAtIso: timestamp,
      customerSlug: input.customerSlug ?? null,
      id,
      kind,
      owner: appSyncOwner(owner.userId),
      ownerIdentityId: owner.identityId,
      payload: input.payload,
      payloadVersion: input.payloadVersion,
      status: input.status,
      threadId: input.threadId,
      title: input.title,
      updatedAt: timestamp,
      updatedAtIso: timestamp,
      userId: owner.userId,
    };

    await this.client.send(
      new PutItemCommand({
        TableName: this.tableName,
        Item: marshall(item, { removeUndefinedValues: true }),
      }),
    );

    return toRecord(item);
  }

  async getActiveArtifact(
    threadId: string,
    kind: ArtifactKind,
    owner: OwnerContext,
  ): Promise<ArtifactRecord | null> {
    const artifactKind = assertArtifactKind(kind);
    const result = await this.client.send(
      new GetItemCommand({
        TableName: this.tableName,
        Key: marshall({ id: activeId(owner, threadId, artifactKind) }),
      }),
    );

    if (!result.Item) {
      return null;
    }

    const item = unmarshall(result.Item) as ArtifactItem;
    if (item.userId !== owner.userId || item.status !== "ready") {
      return null;
    }

    return toRecord(item);
  }

  async listArtifactsByThread(): Promise<ArtifactRecord[]> {
    throw new Error("LambdaDynamoDbArtifactStore.listArtifactsByThread is not used by PR2 tools.");
  }
}

export const createLambdaDynamoDbArtifactStore = (
  config: LambdaDynamoDbArtifactStoreConfig,
): ArtifactStore => new LambdaDynamoDbArtifactStore(config);

export const createLambdaDynamoDbArtifactStoreFromEnv = (
  env: LambdaDynamoDbArtifactStoreEnv = process.env as LambdaDynamoDbArtifactStoreEnv,
  clientConfig: DynamoDBClientConfig = {},
): ArtifactStore => {
  if (!env.LAMBDA_CHAT_ARTIFACT_TABLE_NAME) {
    throw new Error(
      "Missing required Lambda chat environment variable: LAMBDA_CHAT_ARTIFACT_TABLE_NAME",
    );
  }

  return createLambdaDynamoDbArtifactStore({
    artifactTableName: env.LAMBDA_CHAT_ARTIFACT_TABLE_NAME,
    client: new DynamoDBClient({ region: env.AWS_REGION, ...clientConfig }),
  });
};
