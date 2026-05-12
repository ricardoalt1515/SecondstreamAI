"use server";

import { z } from "zod";
import { getCurrentOwner } from "@/lib/auth/server";
import {
  attachmentRefToFilePart,
  filePartToAttachmentRef,
} from "@/lib/storage/attachment-metadata";
import { getChatStore } from "@/lib/storage/chat-store";
import type { MyUIMessage } from "@/types/ui-message";

const getThreadMessagesSchema = z.object({ threadId: z.string().min(1) });

export async function getThreadMessages(input: z.infer<typeof getThreadMessagesSchema>): Promise<{
  messages: MyUIMessage[];
}> {
  const { threadId } = getThreadMessagesSchema.parse(input);
  const owner = await getCurrentOwner();
  const chatStore = await getChatStore();
  const thread = await chatStore.getThreadById(threadId);

  console.info("[chat] get-thread-messages:thread-check", {
    threadId,
    ownerUserId: owner.userId,
    threadIdFromStore: thread?.id ?? null,
    threadResourceId: thread?.resourceId ?? null,
  });

  if (!thread || thread.resourceId !== owner.userId) {
    throw new Error("Thread not found");
  }

  const messages = await chatStore.getThreadMessages(threadId);

  const hydrated = messages.map((message) => ({
    ...message,
    parts: Array.isArray(message.parts)
      ? message.parts.map((part) => {
          if (part.type !== "file") {
            return part;
          }

          const metadata = filePartToAttachmentRef({
            type: "file",
            mediaType: part.mediaType,
            filename: part.filename,
            url: part.url,
            metadata: (part as { metadata?: unknown }).metadata,
          });

          return metadata
            ? ({ ...attachmentRefToFilePart(metadata), metadata } as MyUIMessage["parts"][number])
            : part;
        })
      : [],
  }));

  return { messages: hydrated };
}
