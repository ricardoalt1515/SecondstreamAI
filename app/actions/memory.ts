"use server";

import { type WorkingMemory, workingMemorySchema } from "@/config/working-memory";
import { getCurrentOwner } from "@/lib/auth/server";
import { getWorkingMemoryStore } from "@/lib/storage/working-memory-store";

export async function getWorkingMemory(): Promise<{ workingMemory: WorkingMemory | null }> {
  const owner = await getCurrentOwner();
  const store = await getWorkingMemoryStore();
  const raw = await store.get(owner.userId);

  if (!raw) {
    return { workingMemory: null };
  }

  const parsed = workingMemorySchema.safeParse(raw);
  return { workingMemory: parsed.success ? parsed.data : null };
}

export async function updateWorkingMemory(data: WorkingMemory): Promise<{ success: true }> {
  const owner = await getCurrentOwner();
  const store = await getWorkingMemoryStore();
  await store.set(owner.userId, workingMemorySchema.parse(data));

  return { success: true };
}
