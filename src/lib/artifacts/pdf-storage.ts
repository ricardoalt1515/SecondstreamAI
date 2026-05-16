import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import type { ArtifactKind } from "@/lib/artifacts/artifact-store";
import {
  bodyToBuffer,
  normalizePrefix,
  requiredEnv,
  sanitizePathSegment,
} from "@/lib/storage/s3-utils";

// Storage abstraction for rendered PDF bytes. Keys are deterministic from
// (userId, threadId, kind) so regenerations overwrite the previous PDF
// in-place — same lifecycle semantics as the active artifact row.
export interface ArtifactPdfStorage {
  put(input: { userId: string; threadId: string; kind: ArtifactKind; bytes: Buffer }): Promise<{
    key: string;
  }>;
  get(input: { userId: string; threadId: string; kind: ArtifactKind }): Promise<Buffer | null>;
}

export const buildPdfStorageKey = ({
  prefix,
  userId,
  threadId,
  kind,
}: {
  prefix: string;
  userId: string;
  threadId: string;
  kind: ArtifactKind;
}): string => {
  const safePrefix = normalizePrefix(prefix);
  const scoped = `artifacts/${sanitizePathSegment(userId)}/${sanitizePathSegment(threadId)}/${kind}.pdf`;
  return safePrefix ? `${safePrefix}/${scoped}` : scoped;
};

export type S3ArtifactPdfStorageClient = Pick<S3Client, "send">;

export type S3ArtifactPdfStorageConfig = {
  bucket: string;
  client: S3ArtifactPdfStorageClient;
  prefix?: string;
};

export class S3ArtifactPdfStorage implements ArtifactPdfStorage {
  private readonly bucket: string;
  private readonly client: S3ArtifactPdfStorageClient;
  private readonly prefix: string;

  constructor(config: S3ArtifactPdfStorageConfig) {
    this.bucket = config.bucket;
    this.client = config.client;
    this.prefix = config.prefix ?? "";
  }

  async put({
    userId,
    threadId,
    kind,
    bytes,
  }: {
    userId: string;
    threadId: string;
    kind: ArtifactKind;
    bytes: Buffer;
  }): Promise<{ key: string }> {
    const key = buildPdfStorageKey({ prefix: this.prefix, userId, threadId, kind });
    await this.client.send(
      new PutObjectCommand({
        Body: new Uint8Array(bytes),
        Bucket: this.bucket,
        ContentType: "application/pdf",
        Key: key,
      }),
    );
    return { key };
  }

  async get({
    userId,
    threadId,
    kind,
  }: {
    userId: string;
    threadId: string;
    kind: ArtifactKind;
  }): Promise<Buffer | null> {
    const key = buildPdfStorageKey({ prefix: this.prefix, userId, threadId, kind });
    try {
      const result = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return bodyToBuffer((result as { Body?: unknown }).Body);
    } catch (error) {
      const name = (error as { name?: string } | null)?.name;
      if (name === "NoSuchKey" || name === "NotFound") {
        return null;
      }
      throw error;
    }
  }
}

export class InMemoryArtifactPdfStorage implements ArtifactPdfStorage {
  private readonly store = new Map<string, Buffer>();

  async put({
    userId,
    threadId,
    kind,
    bytes,
  }: {
    userId: string;
    threadId: string;
    kind: ArtifactKind;
    bytes: Buffer;
  }): Promise<{ key: string }> {
    const key = buildPdfStorageKey({ prefix: "", userId, threadId, kind });
    this.store.set(key, Buffer.from(bytes));
    return { key };
  }

  async get({
    userId,
    threadId,
    kind,
  }: {
    userId: string;
    threadId: string;
    kind: ArtifactKind;
  }): Promise<Buffer | null> {
    const key = buildPdfStorageKey({ prefix: "", userId, threadId, kind });
    return this.store.get(key) ?? null;
  }
}

export type S3ArtifactPdfStorageEnv = {
  AWS_REGION?: string;
  LAMBDA_CHAT_BLOB_BUCKET_NAME?: string;
  LAMBDA_CHAT_BLOB_PREFIX?: string;
};

export const createS3ArtifactPdfStorageFromEnv = (
  env: S3ArtifactPdfStorageEnv = process.env as S3ArtifactPdfStorageEnv,
  clientConfig: S3ClientConfig = {},
): ArtifactPdfStorage => {
  const region = requiredEnv(
    env as Record<string, string | undefined>,
    "AWS_REGION",
    "Lambda PDF storage environment",
  );
  const bucket = requiredEnv(
    env as Record<string, string | undefined>,
    "LAMBDA_CHAT_BLOB_BUCKET_NAME",
    "Lambda PDF storage environment",
  );
  return new S3ArtifactPdfStorage({
    bucket,
    prefix: env.LAMBDA_CHAT_BLOB_PREFIX ?? "",
    client: new S3Client({ region, ...clientConfig }),
  });
};
