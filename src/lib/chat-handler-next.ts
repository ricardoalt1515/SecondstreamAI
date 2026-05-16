import { generateText } from "ai";
import { createAgent } from "@/ai/agents/agent";
import { getEnv } from "@/config/env";
import { createAmplifyArtifactStore } from "@/lib/artifacts/amplify-artifact-store";
import { getCurrentOwner } from "@/lib/auth/server";
import { createChatPostHandler } from "@/lib/chat-handler";
import { createS3BlobStore } from "@/lib/storage/s3-blob-store";

let cachedHandler: ReturnType<typeof createChatPostHandler> | null = null;

const getDefaultHandler = async (): Promise<ReturnType<typeof createChatPostHandler>> => {
  if (cachedHandler) {
    return cachedHandler;
  }

  const env = process.env.CHAT_BLOB_STORE_RUNTIME === "s3" ? getEnv() : null;
  const { getChatStore } = await import("@/lib/storage/chat-store");
  const chatStore = await getChatStore();
  const blobStore = env
    ? createS3BlobStore({
        bucket: env.CHAT_ATTACHMENTS_S3_BUCKET,
        prefix: env.CHAT_ATTACHMENTS_S3_PREFIX,
        region: env.AWS_REGION,
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        sessionToken: env.AWS_SESSION_TOKEN,
      })
    : (await import("@/lib/storage/amplify-blob-store")).createAmplifyBlobStore();

  cachedHandler = createChatPostHandler({
    chatStore,
    blobStore,
    artifactStore: createAmplifyArtifactStore(),
    createAgent,
    generateText,
    getOwner: getCurrentOwner,
  });

  return cachedHandler;
};

export const chatPost = async ({ request }: { request: Request }): Promise<Response> => {
  const handler = await getDefaultHandler();
  return handler({ request });
};
