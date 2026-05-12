import { nanoid } from "nanoid";
import type { MyUIMessage } from "@/types/ui-message";

type MessageLike = Omit<MyUIMessage, "id"> & { id?: string };

export const toBedrockModelId = (runtimeModelId: string): string => {
  if (runtimeModelId.includes("/")) {
    return runtimeModelId.split("/").slice(1).join("/");
  }

  return runtimeModelId;
};

export const ensureServerMessageId = (message: MessageLike): MyUIMessage => {
  return {
    ...message,
    id: message.id || nanoid(),
  };
};

export const extractLastUserMessage = (messages: MessageLike[]): MyUIMessage | null => {
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if (message.role === "user") {
      return ensureServerMessageId(message);
    }
  }

  return null;
};

export const isStableThreadTitle = (title: string | null | undefined): boolean => {
  if (!title) {
    return false;
  }

  return title.trim().toLowerCase() !== "new chat";
};
