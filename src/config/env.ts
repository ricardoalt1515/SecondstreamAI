import { z } from "zod";

const envSchema = z.object({
  AWS_REGION: z.string().trim().min(1).default("us-east-1"),
  CHAT_ATTACHMENTS_S3_BUCKET: z.string().trim().min(1),
  CHAT_ATTACHMENTS_S3_PREFIX: z.string().trim().min(1).default("secondstream/attachments/"),
  AWS_ACCESS_KEY_ID: z.string().trim().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().trim().optional(),
  AWS_SESSION_TOKEN: z.string().trim().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

const ensureTrailingSlash = (value: string): string => (value.endsWith("/") ? value : `${value}/`);

let cachedEnv: AppEnv | null = null;

export const getEnv = (): AppEnv => {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }

  cachedEnv = {
    ...parsed.data,
    CHAT_ATTACHMENTS_S3_PREFIX: ensureTrailingSlash(parsed.data.CHAT_ATTACHMENTS_S3_PREFIX),
  };

  return cachedEnv;
};

export const buildS3ObjectUrl = (bucket: string, region: string, key: string): string => {
  const safeKey = key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `https://${bucket}.s3.${region}.amazonaws.com/${safeKey}`;
};
