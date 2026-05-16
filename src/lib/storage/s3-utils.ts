// Shared S3 plumbing reused by lambda-blob-store and the artifact PDF storage.
// Both modules previously held private copies of the same helpers.

type TransformableS3Body = { transformToByteArray(): Promise<Uint8Array> };

export const bodyToBuffer = async (body: unknown): Promise<Buffer> => {
  if (!body) return Buffer.alloc(0);
  if (Buffer.isBuffer(body)) return Buffer.from(body);
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (
    typeof body === "object" &&
    body !== null &&
    "transformToByteArray" in body &&
    typeof (body as TransformableS3Body).transformToByteArray === "function"
  ) {
    return Buffer.from(await (body as TransformableS3Body).transformToByteArray());
  }
  throw new Error("Unsupported S3 object body type.");
};

export const sanitizePathSegment = (value: string): string =>
  value.replace(/[^a-zA-Z0-9._-]/g, "-");

export const normalizePrefix = (prefix: string): string =>
  prefix
    .split("/")
    .map((segment) => sanitizePathSegment(segment.trim()))
    .filter(Boolean)
    .join("/");

export const requiredEnv = <T extends Record<string, string | undefined>>(
  env: T,
  name: keyof T & string,
  scope = "environment",
): string => {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing required ${scope} variable: ${name}`);
  }
  return value;
};
