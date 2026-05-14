export const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_REQUEST = 5;

// AWS Lambda Function URL synchronous invokes have a 6 MB request payload ceiling.
// Chat attachments are transported inline as base64 data URLs inside JSON, so keep
// the aggregate binary payload below that ceiling to leave room for base64 and
// request/message metadata overhead.
export const MAX_ATTACHMENT_PAYLOAD_BYTES = 4 * 1024 * 1024;

export const SUPPORTED_ATTACHMENT_MEDIA_TYPES = [
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/html",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
] as const;

export type SupportedAttachmentMediaType = (typeof SUPPORTED_ATTACHMENT_MEDIA_TYPES)[number];

export const SUPPORTED_ATTACHMENT_MIME_PATTERNS = SUPPORTED_ATTACHMENT_MEDIA_TYPES;

const SUPPORTED_ATTACHMENT_MEDIA_TYPE_SET = new Set<string>(SUPPORTED_ATTACHMENT_MEDIA_TYPES);

export const isSupportedAttachmentMediaType = (mediaType: string): boolean =>
  SUPPORTED_ATTACHMENT_MEDIA_TYPE_SET.has(mediaType);

export type AttachmentCapability = "text" | "image" | "pdf";

export const getAttachmentCapability = (mediaType: string): AttachmentCapability | null => {
  if (!isSupportedAttachmentMediaType(mediaType)) {
    return null;
  }

  if (mediaType.startsWith("text/")) {
    return "text";
  }

  if (mediaType.startsWith("image/")) {
    return "image";
  }

  if (mediaType === "application/pdf") {
    return "pdf";
  }

  return null;
};
