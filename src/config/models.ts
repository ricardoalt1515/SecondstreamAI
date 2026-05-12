import type { ModelSelectorLogoProps } from "@/components/ai-elements/model-selector";

type ProviderSlug = ModelSelectorLogoProps["provider"];

export const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_REQUEST = 5;

export const SUPPORTED_ATTACHMENT_MIME_PATTERNS = ["text/*", "image/*", "application/pdf"] as const;

export const MODEL_GROUPS = ["Amazon"] as const;

export type AttachmentCapability = "text" | "image" | "pdf";

export type ModelOption = {
  chef: (typeof MODEL_GROUPS)[number];
  chefSlug: ProviderSlug;
  capabilities: readonly AttachmentCapability[];
  id: string;
  name: string;
  provider: ProviderSlug;
  runtimeModelId: string;
};

export const MODELS = [
  {
    chef: "Amazon",
    chefSlug: "amazon-bedrock",
    capabilities: ["text", "image", "pdf"],
    id: "claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    provider: "amazon-bedrock",
    runtimeModelId: "us.anthropic.claude-sonnet-4-6",
  },
] as const satisfies ReadonlyArray<ModelOption>;

export type ModelId = (typeof MODELS)[number]["id"];

export const DEFAULT_MODEL_ID: ModelId = "claude-sonnet-4-6";

export const FAST_TITLE_MODEL_ID: ModelId = "claude-sonnet-4-6";

export const DEFAULT_RUNTIME_MODEL_ID = "amazon-bedrock/us.anthropic.claude-sonnet-4-6";

export const FAST_TITLE_RUNTIME_MODEL_ID = "amazon-bedrock/us.anthropic.claude-sonnet-4-6";

export const MODEL_ID_SET = new Set<string>(MODELS.map((model) => model.id));

export const MODEL_BY_ID = new Map<string, ModelOption>(MODELS.map((model) => [model.id, model]));

export const getRuntimeModelIdentifier = (modelId: string): string | null => {
  const model = MODEL_BY_ID.get(modelId);
  if (!model) {
    return null;
  }

  return `${model.provider}/${model.runtimeModelId}`;
};

export const normalizeAttachmentCapability = (mediaType: string): AttachmentCapability | null => {
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
