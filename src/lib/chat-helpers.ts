import { z } from "zod";
import {
  DEFAULT_RUNTIME_MODEL_ID,
  getRuntimeModelIdentifier,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_REQUEST,
  MODEL_BY_ID,
  MODEL_ID_SET,
  normalizeAttachmentCapability,
} from "@/config/models";
import type { MyUIMessage } from "@/types/ui-message";

export const ATTACHMENT_ERROR_CODES = {
  documentTextRequired: "DOCUMENT_TEXT_REQUIRED",
  fileTooLarge: "FILE_TOO_LARGE",
  invalidModel: "INVALID_MODEL",
  malformedPayload: "MALFORMED_ATTACHMENT_PAYLOAD",
  modelMismatch: "MODEL_ATTACHMENT_MISMATCH",
  tooManyFiles: "TOO_MANY_ATTACHMENTS",
  unsupportedMime: "UNSUPPORTED_ATTACHMENT_MIME",
} as const;

type AttachmentErrorCode = (typeof ATTACHMENT_ERROR_CODES)[keyof typeof ATTACHMENT_ERROR_CODES];

export class ChatRequestValidationError extends Error {
  readonly code: AttachmentErrorCode;
  readonly statusCode: number;

  constructor(code: AttachmentErrorCode, message: string, statusCode = 400) {
    super(message);
    this.name = "ChatRequestValidationError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

const chatRequestSchema = z.object({
  threadId: z.string().min(1),
  messages: z.array(z.any()).min(1),
  trigger: z.string().optional(),
  messageId: z.string().optional(),
  modelId: z.string().optional(),
  webSearchEnabled: z.boolean().optional().default(false),
});

export type ChatRequest = {
  threadId: string;
  messages: MyUIMessage[];
  trigger?: string;
  regenerateMessageId?: string;
  modelId: string;
  runtimeModelId: string;
  webSearchEnabled: boolean;
};

/**
 * Parse and validate the incoming chat request body.
 * Returns a typed, sanitized ChatRequest or throws on invalid input.
 */
export function parseChatRequest(params: unknown): ChatRequest {
  const parsed = chatRequestSchema.parse(params);

  if (!parsed.modelId || !MODEL_ID_SET.has(parsed.modelId)) {
    throw new ChatRequestValidationError(
      ATTACHMENT_ERROR_CODES.invalidModel,
      "Unsupported model. Please use the default chat model.",
    );
  }

  const fileParts = parsed.messages
    .flatMap((message) => ((message as { parts?: unknown[] }).parts ?? []).filter(Boolean))
    .filter(
      (
        part,
      ): part is {
        type: "file";
        mediaType: string;
        url: string;
      } =>
        typeof part === "object" &&
        part !== null &&
        (part as { type?: unknown }).type === "file" &&
        typeof (part as { mediaType?: unknown }).mediaType === "string" &&
        typeof (part as { url?: unknown }).url === "string",
    );

  if (fileParts.length > MAX_ATTACHMENTS_PER_REQUEST) {
    throw new ChatRequestValidationError(
      ATTACHMENT_ERROR_CODES.tooManyFiles,
      `Too many attachments. You can send up to ${MAX_ATTACHMENTS_PER_REQUEST} files per message.`,
    );
  }

  const model = MODEL_BY_ID.get(parsed.modelId);

  if (!model) {
    throw new ChatRequestValidationError(
      ATTACHMENT_ERROR_CODES.invalidModel,
      "Unsupported model. Please use the default chat model.",
    );
  }

  for (const message of parsed.messages) {
    const parts = (message as { parts?: unknown[] }).parts ?? [];
    let hasTextInMessage = false;
    let hasPdfInMessage = false;

    for (const part of parts) {
      if (typeof part !== "object" || part === null) {
        continue;
      }

      if ((part as { type?: unknown }).type === "text") {
        const text = (part as { text?: unknown }).text;
        if (typeof text === "string" && text.trim().length > 0) {
          hasTextInMessage = true;
        }
      }

      if ((part as { type?: unknown }).type === "file") {
        const mediaType = (part as { mediaType?: unknown }).mediaType;
        const url = (part as { url?: unknown }).url;

        if (typeof mediaType !== "string" || typeof url !== "string") {
          throw new ChatRequestValidationError(
            ATTACHMENT_ERROR_CODES.malformedPayload,
            "Malformed attachment: mediaType and url are required.",
          );
        }

        if (mediaType === "application/pdf") {
          hasPdfInMessage = true;
        }
      }
    }

    if (hasPdfInMessage && !hasTextInMessage) {
      throw new ChatRequestValidationError(
        ATTACHMENT_ERROR_CODES.documentTextRequired,
        "PDF attachments require a short instruction in the same message.",
      );
    }
  }

  for (const filePart of fileParts) {
    const capability = normalizeAttachmentCapability(filePart.mediaType);
    if (!capability) {
      throw new ChatRequestValidationError(
        ATTACHMENT_ERROR_CODES.unsupportedMime,
        `Unsupported file type: ${filePart.mediaType}. Use text/*, image/*, or application/pdf.`,
      );
    }

    if (!model.capabilities.includes(capability)) {
      throw new ChatRequestValidationError(
        ATTACHMENT_ERROR_CODES.modelMismatch,
        `The current model does not support ${filePart.mediaType} attachments.`,
      );
    }

    if (!filePart.url.startsWith("data:")) {
      const metadata = (filePart as { metadata?: unknown }).metadata;
      const isPersistedRef =
        typeof metadata === "object" &&
        metadata !== null &&
        (metadata as { version?: unknown }).version === 1 &&
        typeof (metadata as { s3Key?: unknown }).s3Key === "string" &&
        typeof (metadata as { sizeBytes?: unknown }).sizeBytes === "number";

      if (!isPersistedRef) {
        throw new ChatRequestValidationError(
          ATTACHMENT_ERROR_CODES.malformedPayload,
          "Malformed attachment: expected a data URL or a valid persisted file reference.",
        );
      }

      continue;
    }

    const [, payload = ""] = filePart.url.split(",", 2);
    const normalizedPayload = payload.replace(/\s/g, "");
    const binarySize = Math.floor((normalizedPayload.length * 3) / 4);
    if (binarySize > MAX_ATTACHMENT_BYTES) {
      throw new ChatRequestValidationError(
        ATTACHMENT_ERROR_CODES.fileTooLarge,
        `File is too large. Each attachment must be 4 MB or smaller (${MAX_ATTACHMENT_BYTES} bytes).`,
      );
    }
  }

  return {
    threadId: parsed.threadId,
    messages: parsed.messages as MyUIMessage[],
    trigger: parsed.trigger,
    regenerateMessageId: parsed.messageId,
    modelId: parsed.modelId,
    runtimeModelId: getRuntimeModelIdentifier(parsed.modelId) ?? DEFAULT_RUNTIME_MODEL_ID,
    webSearchEnabled: parsed.webSearchEnabled,
  };
}
