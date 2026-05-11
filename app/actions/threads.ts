"use server";

import { nanoid } from "nanoid";
import { z } from "zod";
import { getCurrentOwner } from "@/lib/auth/server";
import { getChatStore, type StoredThread } from "@/lib/storage/chat-store";

export type Thread = {
  id: string;
  title: string | null;
  resourceId: string;
  createdAt: string;
  updatedAt: string;
};

const toThread = (thread: StoredThread): Thread => ({
  id: thread.id,
  title: thread.title ?? null,
  resourceId: thread.resourceId,
  createdAt: new Date(thread.createdAt).toISOString(),
  updatedAt: new Date(thread.updatedAt).toISOString(),
});

export async function getThreads(): Promise<{ threads: Thread[] }> {
  const owner = await getCurrentOwner();
  const chatStore = await getChatStore();
  const threads = (await chatStore.listThreads(owner.userId)).map(toThread);

  return { threads };
}

const deleteThreadSchema = z.object({ threadId: z.string().min(1) });

export async function deleteThread(
  input: z.infer<typeof deleteThreadSchema>,
): Promise<{ success: true }> {
  const { threadId } = deleteThreadSchema.parse(input);
  const owner = await getCurrentOwner();
  const chatStore = await getChatStore();
  const thread = await chatStore.getThreadById(threadId);

  if (!thread || thread.resourceId !== owner.userId) {
    throw new Error("Thread not found");
  }

  await chatStore.deleteThread(threadId);

  return { success: true };
}

const cloneThreadSchema = z.object({
  sourceThreadId: z.string().min(1),
  upToMessageId: z.string().optional(),
});

export async function cloneThread(
  input: z.infer<typeof cloneThreadSchema>,
): Promise<{ thread: Thread }> {
  const data = cloneThreadSchema.parse(input);
  const owner = await getCurrentOwner();
  const chatStore = await getChatStore();
  const source = await chatStore.getThreadById(data.sourceThreadId);

  if (!source || source.resourceId !== owner.userId) {
    throw new Error("Thread not found");
  }

  const thread = await chatStore.cloneThread(data.sourceThreadId, owner.userId, data.upToMessageId);

  return { thread: toThread(thread) };
}

export async function createThread(): Promise<{ thread: Thread }> {
  const owner = await getCurrentOwner();
  const chatStore = await getChatStore();
  const thread = await chatStore.createThread(nanoid(), owner.userId, "New Chat");

  return { thread: toThread(thread) };
}
