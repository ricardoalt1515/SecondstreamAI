import { createHash, createHmac, randomUUID } from "node:crypto";
import { buildS3ObjectUrl } from "@/config/env";
import type { BlobStore, PutBlobInput, PutBlobResult } from "@/lib/storage/blob-store";

type S3BlobStoreConfig = {
  bucket: string;
  prefix: string;
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
};

const encodeS3Path = (key: string): string =>
  key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

const ensurePrefix = (value: string): string => (value.endsWith("/") ? value : `${value}/`);

const sha256Hex = (value: string | Buffer): string =>
  createHash("sha256").update(value).digest("hex");

const hmac = (key: Buffer | string, value: string): Buffer =>
  createHmac("sha256", key).update(value).digest();

const formatAmzDate = (date: Date): { amzDate: string; dateStamp: string } => {
  const iso = date.toISOString();
  const amzDate = `${iso.slice(0, 10).replace(/-/g, "")}T${iso.slice(11, 19).replace(/:/g, "")}Z`;
  const dateStamp = iso.slice(0, 10).replace(/-/g, "");
  return { amzDate, dateStamp };
};

const deriveSigningKey = (secretAccessKey: string, dateStamp: string, region: string): Buffer => {
  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, "s3");
  return hmac(kService, "aws4_request");
};

const buildCanonicalHeaders = (headers: Record<string, string>) => {
  const entries = Object.entries(headers)
    .map(([k, v]) => [k.toLowerCase(), v.trim()] as const)
    .sort(([a], [b]) => a.localeCompare(b));

  const canonicalHeaders = entries.map(([k, v]) => `${k}:${v}\n`).join("");
  const signedHeaders = entries.map(([k]) => k).join(";");

  return { canonicalHeaders, signedHeaders };
};

export const createS3ObjectKey = (input: {
  prefix: string;
  threadId: string;
  filename: string;
}): string => {
  const prefix = ensurePrefix(input.prefix);
  const safeThreadId = input.threadId.replace(/[^a-zA-Z0-9-_]/g, "-");
  const safeFilename = input.filename.replace(/[^a-zA-Z0-9._-]/g, "-");
  return `${prefix}${safeThreadId}/${randomUUID()}-${safeFilename}`;
};

class InMemoryS3BlobStore implements BlobStore {
  private readonly blobs = new Map<string, Buffer>();

  constructor(private readonly config: Pick<S3BlobStoreConfig, "bucket" | "prefix" | "region">) {}

  async put(input: PutBlobInput): Promise<PutBlobResult> {
    const key = createS3ObjectKey({
      prefix: this.config.prefix,
      threadId: input.threadId,
      filename: input.filename,
    });

    this.blobs.set(key, Buffer.from(input.bytes));

    return {
      key,
      sizeBytes: input.bytes.length,
      url: buildS3ObjectUrl(this.config.bucket, this.config.region, key),
    };
  }

  async get(key: string): Promise<Buffer> {
    const value = this.blobs.get(key);
    if (!value) {
      throw new Error(`S3 object not found: ${key}`);
    }
    return Buffer.from(value);
  }

  async delete(key: string): Promise<void> {
    this.blobs.delete(key);
  }
}

class AwsS3BlobStore implements BlobStore {
  constructor(private readonly config: S3BlobStoreConfig) {}

  async put(input: PutBlobInput): Promise<PutBlobResult> {
    const key = createS3ObjectKey({
      prefix: this.config.prefix,
      threadId: input.threadId,
      filename: input.filename,
    });

    await this.signedRequest({
      method: "PUT",
      key,
      body: input.bytes,
      mediaType: input.mediaType,
    });

    return {
      key,
      sizeBytes: input.bytes.length,
      url: buildS3ObjectUrl(this.config.bucket, this.config.region, key),
    };
  }

  async get(key: string): Promise<Buffer> {
    const response = await this.signedRequest({ method: "GET", key });
    const bytes = Buffer.from(await response.arrayBuffer());
    return bytes;
  }

  async delete(key: string): Promise<void> {
    await this.signedRequest({ method: "DELETE", key });
  }

  private async signedRequest(input: {
    method: "PUT" | "GET" | "DELETE";
    key: string;
    body?: Buffer;
    mediaType?: string;
  }): Promise<Response> {
    if (!this.config.accessKeyId || !this.config.secretAccessKey) {
      throw new Error("Missing AWS credentials for S3 attachment storage");
    }

    const now = new Date();
    const { amzDate, dateStamp } = formatAmzDate(now);
    const host = `${this.config.bucket}.s3.${this.config.region}.amazonaws.com`;
    const canonicalUri = `/${encodeS3Path(input.key)}`;
    const url = `https://${host}${canonicalUri}`;

    const payloadHash =
      input.method === "PUT" ? sha256Hex(input.body ?? Buffer.alloc(0)) : sha256Hex("");

    const headers: Record<string, string> = {
      host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    };

    if (input.mediaType && input.method === "PUT") {
      headers["content-type"] = input.mediaType;
    }

    if (this.config.sessionToken) {
      headers["x-amz-security-token"] = this.config.sessionToken;
    }

    const { canonicalHeaders, signedHeaders } = buildCanonicalHeaders(headers);

    const canonicalRequest = [
      input.method,
      canonicalUri,
      "",
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const credentialScope = `${dateStamp}/${this.config.region}/s3/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      sha256Hex(canonicalRequest),
    ].join("\n");

    const signingKey = deriveSigningKey(this.config.secretAccessKey, dateStamp, this.config.region);
    const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");

    const authorization =
      `AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const response = await fetch(url, {
      method: input.method,
      headers: {
        ...headers,
        Authorization: authorization,
      },
      body: input.body ? new Uint8Array(input.body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `S3 request failed (${response.status} ${response.statusText}): ${errorText}`,
      );
    }

    return response;
  }
}

export const createInMemoryS3BlobStore = (
  config: Pick<S3BlobStoreConfig, "bucket" | "prefix" | "region">,
): BlobStore => new InMemoryS3BlobStore(config);

export const createS3BlobStore = (config: S3BlobStoreConfig): BlobStore =>
  new AwsS3BlobStore(config);
