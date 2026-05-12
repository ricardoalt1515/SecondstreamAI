import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateText,
  validateUIMessages,
} from "ai";
import { nanoid } from "nanoid";
import { getEnv } from "@/config/env";
import { MODELS } from "@/config/models";
import type { StreamAgent } from "@/lib/agents/registry";
import { getCurrentOwner, type OwnerContext } from "@/lib/auth/server";
import {
  ATTACHMENT_ERROR_CODES,
  ChatRequestValidationError,
  parseChatRequest,
} from "@/lib/chat-helpers";
import {
  ensureServerMessageId,
  extractLastUserMessage,
  isStableThreadTitle,
} from "@/lib/chat-runtime";
import {
  attachmentRefToPersistedPart,
  buildAttachmentRef,
  filePartToAttachmentRef,
  isSupportedAttachmentMediaType,
} from "@/lib/storage/attachment-metadata";
import type { BlobStore } from "@/lib/storage/blob-store";
import type { ChatStore } from "@/lib/storage/chat-store";
import { getChatStore } from "@/lib/storage/chat-store";
import { createS3BlobStore } from "@/lib/storage/s3-blob-store";
import type { MyUIMessage } from "@/types/ui-message";

type GenerateTextFn = typeof generateText;

const BEDROCK_PROVIDER = createAmazonBedrock({
  region: process.env.AWS_REGION || "us-east-1",
});

const DEFAULT_BEDROCK_MODEL_ID = MODELS[0].runtimeModelId;

type Dependencies = {
  chatStore: ChatStore;
  blobStore: BlobStore;
  agent: StreamAgent;
  generateText: GenerateTextFn;
  getOwner: () => Promise<OwnerContext>;
};

const titlePrompt = (text: string): string =>
  `Genera un título breve de máximo 6 palabras para esta conversación:\n\n${text}`;

// Title generation model - using same model as main agent for consistency
const createTitleModel = () => {
  // Use Claude Sonnet 4.6 for title generation (same as main agent)
  return BEDROCK_PROVIDER(DEFAULT_BEDROCK_MODEL_ID);
};

const sanitizeTitle = (title: string): string => {
  const next = title.replace(/[\n\r]+/g, " ").trim();
  if (!next) {
    return "New Stream";
  }

  return next.slice(0, 80);
};

const extractAssistantText = (message: MyUIMessage): string =>
  message.parts
    .filter(
      (part): part is Extract<MyUIMessage["parts"][number], { type: "text" }> =>
        part.type === "text",
    )
    .map((part) => part.text)
    .join("\n")
    .trim();

const decodeDataUrl = (url: string): Buffer => {
  const parts = url.split(",", 2);
  if (parts.length !== 2) {
    throw new ChatRequestValidationError(
      ATTACHMENT_ERROR_CODES.malformedPayload,
      "Invalid attachment payload.",
    );
  }

  return Buffer.from(parts[1], "base64");
};

const withAttachmentPersistence = async (
  message: MyUIMessage,
  params: {
    threadId: string;
    blobStore: BlobStore;
  },
): Promise<MyUIMessage> => {
  const nextParts: MyUIMessage["parts"] = [];

  for (const part of message.parts) {
    if (part.type !== "file") {
      nextParts.push(part);
      continue;
    }

    if (!isSupportedAttachmentMediaType(part.mediaType)) {
      throw new ChatRequestValidationError(
        ATTACHMENT_ERROR_CODES.unsupportedMime,
        "Unsupported file format.",
      );
    }

    if (part.url.startsWith("data:")) {
      const bytes = decodeDataUrl(part.url);
      const saved = await params.blobStore.put({
        bytes,
        filename: part.filename ?? "attachment",
        mediaType: part.mediaType,
        threadId: params.threadId,
      });

      const metadata = buildAttachmentRef({
        filename: part.filename,
        mediaType: part.mediaType,
        s3Key: saved.key,
        sizeBytes: saved.sizeBytes,
        url: saved.url,
      });

      nextParts.push(
        attachmentRefToPersistedPart(metadata) as unknown as MyUIMessage["parts"][number],
      );
      continue;
    }

    const existing = filePartToAttachmentRef({
      type: "file",
      mediaType: part.mediaType,
      filename: part.filename,
      url: part.url,
      metadata: (part as { metadata?: unknown }).metadata,
    });

    if (existing) {
      nextParts.push(
        attachmentRefToPersistedPart(existing) as unknown as MyUIMessage["parts"][number],
      );
      continue;
    }

    nextParts.push(part);
  }

  return {
    ...message,
    parts: nextParts,
  };
};

const withBedrockAttachmentData = async (
  messages: MyUIMessage[],
  blobStore: BlobStore,
): Promise<MyUIMessage[]> => {
  const next: MyUIMessage[] = [];

  for (const message of messages) {
    if (!Array.isArray(message.parts)) {
      next.push({
        ...message,
        parts: [],
      });
      continue;
    }

    const parts: MyUIMessage["parts"] = [];

    for (const part of message.parts) {
      if (part.type !== "file") {
        parts.push(part);
        continue;
      }

      const metadata = filePartToAttachmentRef({
        type: "file",
        mediaType: part.mediaType,
        filename: part.filename,
        url: part.url,
        metadata: (part as { metadata?: unknown }).metadata,
      });

      if (!metadata) {
        parts.push(part);
        continue;
      }

      const bytes = await blobStore.get(metadata.s3Key);
      parts.push({
        type: "file",
        mediaType: metadata.mediaType,
        filename: metadata.filename,
        url: `data:${metadata.mediaType};base64,${bytes.toString("base64")}`,
      } as MyUIMessage["parts"][number]);
    }

    next.push({
      ...message,
      parts,
    });
  }

  return next;
};

export const createChatPostHandler = (deps: Dependencies) => {
  return async ({ request }: { request: Request }) => {
    let params: ReturnType<typeof parseChatRequest>;
    try {
      params = parseChatRequest(await request.json());
    } catch (error) {
      if (error instanceof ChatRequestValidationError) {
        return new Response(error.message, {
          status: error.statusCode,
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "x-error-code": error.code,
          },
        });
      }

      return new Response("We couldn't process that request.", {
        status: 400,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "x-error-code": "REQUEST_INVALID",
        },
      });
    }

    const owner = await deps.getOwner();
    const thread = await deps.chatStore.getThreadById(params.threadId);
    const isNewThread = !thread;

    if (thread && thread.resourceId !== owner.userId) {
      return new Response("Thread not found.", {
        status: 404,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "x-error-code": "THREAD_NOT_FOUND",
        },
      });
    }

    const createdThread = !thread
      ? await deps.chatStore.createThread(params.threadId, owner.userId, "New Chat")
      : null;

    const validated = await validateUIMessages<MyUIMessage>({
      messages: params.messages,
    });

    let persistedHistory = await deps.chatStore.getThreadMessages(params.threadId);

    if (params.trigger === "regenerate-message" && params.regenerateMessageId) {
      const targetIndex = persistedHistory.findIndex(
        (message) => message.id === params.regenerateMessageId,
      );

      if (targetIndex > -1) {
        persistedHistory = persistedHistory.slice(0, targetIndex);
      }
    } else {
      const userMessage = extractLastUserMessage(validated);

      if (!userMessage) {
        return new Response("We couldn't find a valid user message.", {
          status: 400,
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "x-error-code": "REQUEST_INVALID",
          },
        });
      }

      const persistedUserMessage = await withAttachmentPersistence(
        ensureServerMessageId(userMessage),
        {
          threadId: params.threadId,
          blobStore: deps.blobStore,
        },
      );

      await deps.chatStore.saveMessage(params.threadId, persistedUserMessage);
      persistedHistory = [...persistedHistory, persistedUserMessage];
    }

    const historyForModel = await withBedrockAttachmentData(persistedHistory, deps.blobStore);

    const uiMessages = historyForModel.map(({ id: _id, ...rest }) => rest);
    const modelMessages = await convertToModelMessages(uiMessages);

    const stream = createUIMessageStream<MyUIMessage>({
      execute: async ({ writer }) => {
        try {
          if (createdThread) {
            writer.write({
              id: `new-thread-created-${params.threadId}`,
              type: "data-new-thread-created",
              data: {
                threadId: createdThread.id,
                title: createdThread.title ?? "New Chat",
                resourceId: createdThread.resourceId,
                createdAt: createdThread.createdAt,
                updatedAt: createdThread.updatedAt,
              },
            });
          }

          const result = await deps.agent.stream({
            messages: modelMessages,
            onStepFinish: async (step) => {
              console.info("[chat] agent:step-finish", {
                finishReason: step.finishReason,
                toolCalls: (step.toolCalls ?? []).map(
                  (toolCall: { toolName: string }) => toolCall.toolName,
                ),
                toolResults: (step.toolResults ?? []).map(
                  (toolResult: { toolName: string }) => toolResult.toolName,
                ),
                textLength: step.text?.length ?? 0,
              });
            },
          });

          writer.merge(
            result.toUIMessageStream({
              originalMessages: persistedHistory,
              generateMessageId: nanoid,
              onFinish: async ({ responseMessage }: { responseMessage: MyUIMessage }) => {
                console.info("[chat] agent:response-message", {
                  role: responseMessage.role,
                  parts: responseMessage.parts.map((part) => part.type),
                });

                const persistedResponseMessage = ensureServerMessageId(responseMessage);

                if (
                  params.trigger === "regenerate-message" &&
                  params.regenerateMessageId &&
                  persistedResponseMessage.role === "assistant"
                ) {
                  await deps.chatStore.replaceAssistantMessageAfter(
                    params.threadId,
                    params.regenerateMessageId,
                    persistedResponseMessage,
                  );
                } else {
                  await deps.chatStore.saveMessage(params.threadId, persistedResponseMessage);
                }

                const generatedText = extractAssistantText(persistedResponseMessage);
                if (!generatedText) {
                  return;
                }

                const currentThread = await deps.chatStore.getThreadById(params.threadId);
                const mustGenerateTitle = !isStableThreadTitle(currentThread?.title);

                if (isNewThread && mustGenerateTitle) {
                  try {
                    const titleResult = await deps.generateText({
                      model: createTitleModel(),
                      prompt: titlePrompt(generatedText),
                    });

                    const finalTitle = sanitizeTitle(titleResult.text);
                    await deps.chatStore.updateThreadTitle(params.threadId, finalTitle);

                    writer.write({
                      id: `conversation-title-${params.threadId}`,
                      type: "data-conversation-title",
                      data: {
                        title: finalTitle,
                      },
                    });
                  } catch {
                    // keep chat response successful even if title generation fails
                  }
                }
              },
            }),
          );
        } catch (error) {
          console.error("[chat] agent:error", {
            message: error instanceof Error ? error.message : String(error),
          });
          writer.write({
            type: "error",
            errorText: "We couldn't complete the response right now.",
          });
        }
      },
      onError: () => "Something went wrong while generating the response.",
    });

    return createUIMessageStreamResponse({ stream });
  };
};

let cachedHandler: ReturnType<typeof createChatPostHandler> | null = null;

const getDefaultHandler = async (): Promise<ReturnType<typeof createChatPostHandler>> => {
  if (cachedHandler) {
    return cachedHandler;
  }

  const env = process.env.CHAT_BLOB_STORE_RUNTIME === "s3" ? getEnv() : null;
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

  const { COURT_REPORTER_AGENT_ID } = await import("@/lib/agents/court-reporter-agent");
  const { createDefaultAgentRegistry } = await import("@/lib/agents/registry");
  const agentRegistry = await createDefaultAgentRegistry();

  cachedHandler = createChatPostHandler({
    chatStore,
    blobStore,
    agent: agentRegistry.get(COURT_REPORTER_AGENT_ID),
    generateText,
    getOwner: getCurrentOwner,
  });

  return cachedHandler;
};

export const chatPost = async ({ request }: { request: Request }): Promise<Response> => {
  const handler = await getDefaultHandler();
  return handler({ request });
};
