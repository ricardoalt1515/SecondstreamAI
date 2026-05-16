import { describe, expect, it } from "vitest";
import type { OwnerContext } from "@/lib/auth/owner-context";
import {
  type ArtifactKind,
  createInMemoryArtifactStore,
  type PutArtifactInput,
} from "./artifact-store";

const ownerA: OwnerContext = { identityId: "identity-a", userId: "user-a" };
const ownerB: OwnerContext = { identityId: "identity-b", userId: "user-b" };

const artifactInput = (overrides: Partial<PutArtifactInput> = {}): PutArtifactInput => ({
  customerSlug: "prairie-water",
  kind: "field-brief",
  payload: {
    kind: "field-brief",
    title: "Prairie Water Field Brief",
    body: "Version 1",
  },
  payloadVersion: 1,
  status: "ready",
  threadId: "thread-1",
  title: "Prairie Water Field Brief",
  ...overrides,
});

describe("ArtifactStore", () => {
  it("stores and retrieves the active artifact by owner, thread, and kind", async () => {
    const store = createInMemoryArtifactStore({ now: () => new Date("2026-05-15T00:00:00.000Z") });

    const saved = await store.putArtifact(artifactInput(), ownerA);
    const active = await store.getActiveArtifact("thread-1", "field-brief", ownerA);

    expect(active).toEqual(saved);
    expect(active?.ownerUserId).toBe("user-a");
    expect(active?.threadId).toBe("thread-1");
    expect(active?.kind).toBe("field-brief");
    expect(active?.createdAtIso).toBe("2026-05-15T00:00:00.000Z");
  });

  it("isolates artifacts by owner", async () => {
    const store = createInMemoryArtifactStore();

    await store.putArtifact(artifactInput(), ownerA);

    await expect(store.getActiveArtifact("thread-1", "field-brief", ownerB)).resolves.toBeNull();
    await expect(store.listArtifactsByThread("thread-1", ownerB)).resolves.toEqual([]);
  });

  it("resolves replacement writes to the latest active artifact", async () => {
    const dates = [new Date("2026-05-15T00:00:00.000Z"), new Date("2026-05-15T00:01:00.000Z")];
    const store = createInMemoryArtifactStore({ now: () => dates.shift() ?? new Date() });

    await store.putArtifact(
      artifactInput({ payload: { title: "Old", body: "Version 1" } }),
      ownerA,
    );
    const latest = await store.putArtifact(
      artifactInput({ payload: { title: "New", body: "Version 2" }, title: "New" }),
      ownerA,
    );

    const active = await store.getActiveArtifact("thread-1", "field-brief", ownerA);

    expect(active?.id).toBe(latest.id);
    expect(active?.title).toBe("New");
    expect(active?.updatedAtIso).toBe("2026-05-15T00:01:00.000Z");
  });

  it("does not return failed artifacts as active downloadable artifacts", async () => {
    const store = createInMemoryArtifactStore();

    await store.putArtifact(artifactInput({ status: "failed", title: "Failed Brief" }), ownerA);

    await expect(store.getActiveArtifact("thread-1", "field-brief", ownerA)).resolves.toBeNull();
  });

  it("keeps the last ready artifact active when a later failed attempt is recorded", async () => {
    const dates = [new Date("2026-05-15T00:00:00.000Z"), new Date("2026-05-15T00:01:00.000Z")];
    const store = createInMemoryArtifactStore({ now: () => dates.shift() ?? new Date() });

    const ready = await store.putArtifact(artifactInput({ title: "Ready Brief" }), ownerA);
    await store.putArtifact(artifactInput({ status: "failed", title: "Failed Brief" }), ownerA);

    const active = await store.getActiveArtifact("thread-1", "field-brief", ownerA);

    expect(active?.id).toBe(ready.id);
    expect(active?.title).toBe("Ready Brief");
  });

  it("validates artifact kinds", async () => {
    const store = createInMemoryArtifactStore();

    await expect(
      store.putArtifact(artifactInput({ kind: "not-real" as ArtifactKind }), ownerA),
    ).rejects.toThrow("Invalid artifact kind");
  });
});
