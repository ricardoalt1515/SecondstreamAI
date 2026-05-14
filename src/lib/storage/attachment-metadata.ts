import { isSupportedAttachmentMediaType } from "@/config/attachments";

export { isSupportedAttachmentMediaType } from "@/config/attachments";

export const ATTACHMENT_METADATA_VERSION = 1 as const;

export type AttachmentRef = {
  version: typeof ATTACHMENT_METADATA_VERSION;
  filename?: string;
  mediaType: string;
  s3Key: string;
  sizeBytes: number;
  url: string;
};

export type PersistedAttachmentPart = {
  type: "file";
  mediaType: string;
  filename?: string;
  url: string;
  metadata: AttachmentRef;
};

export const buildAttachmentRef = (input: {
  filename?: string;
  mediaType: string;
  s3Key: string;
  sizeBytes: number;
  url: string;
}): AttachmentRef => ({
  version: ATTACHMENT_METADATA_VERSION,
  filename: input.filename,
  mediaType: input.mediaType,
  s3Key: input.s3Key,
  sizeBytes: input.sizeBytes,
  url: input.url,
});

export const isPersistedAttachmentUrl = (url: string): boolean => url.startsWith("s3://");

export const attachmentRefToFilePart = (attachment: AttachmentRef) => {
  return {
    type: "file" as const,
    mediaType: attachment.mediaType,
    filename: attachment.filename,
    url: attachment.url,
  };
};

export const attachmentRefToPersistedPart = (
  attachment: AttachmentRef,
): PersistedAttachmentPart => {
  return {
    type: "file",
    mediaType: attachment.mediaType,
    filename: attachment.filename,
    url: `s3://${attachment.s3Key}`,
    metadata: attachment,
  };
};

export const filePartToAttachmentRef = (part: {
  type: "file";
  mediaType: string;
  filename?: string;
  url: string;
  metadata?: unknown;
}): AttachmentRef | null => {
  if (!part.metadata || typeof part.metadata !== "object") {
    return null;
  }

  const candidate = part.metadata as Partial<AttachmentRef>;
  if (
    candidate.version !== ATTACHMENT_METADATA_VERSION ||
    typeof candidate.mediaType !== "string" ||
    !isSupportedAttachmentMediaType(candidate.mediaType) ||
    typeof candidate.s3Key !== "string" ||
    typeof candidate.sizeBytes !== "number" ||
    typeof candidate.url !== "string"
  ) {
    return null;
  }

  return {
    version: ATTACHMENT_METADATA_VERSION,
    filename: typeof candidate.filename === "string" ? candidate.filename : undefined,
    mediaType: candidate.mediaType,
    s3Key: candidate.s3Key,
    sizeBytes: candidate.sizeBytes,
    url: candidate.url,
  };
};
