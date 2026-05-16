import { describe, expect, it, vi } from "vitest";
import type { OwnerContext } from "@/lib/auth/owner-context";
import { AmplifyArtifactStore } from "./amplify-artifact-store";

const owner: OwnerContext = { identityId: "identity-a", userId: "user-a" };

type ArtifactRow = Record<string, unknown> & { id: string };

const createClient = (initialRows: ArtifactRow[] = []) => {
  const rows = [...initialRows];
  return {
    models: {
      Artifact: {
        create: vi.fn(async (input: ArtifactRow) => {
          rows.push(input);
          return { data: input };
        }),
        list: vi.fn(async (input?: Record<string, unknown>) => {
          const filter = input?.filter as
            | {
                kind?: { eq: string };
                status?: { eq: string };
                threadId?: { eq: string };
                userId?: { eq: string };
              }
            | undefined;
          return {
            data: rows.filter(
              (row) =>
                (!filter?.userId || row.userId === filter.userId.eq) &&
                (!filter?.threadId || row.threadId === filter.threadId.eq) &&
                (!filter?.kind || row.kind === filter.kind.eq) &&
                (!filter?.status || row.status === filter.status.eq),
            ),
          };
        }),
        update: vi.fn(async (input: ArtifactRow) => {
          const index = rows.findIndex((row) => row.id === input.id);
          rows[index] = { ...rows[index], ...input };
          return { data: rows[index] };
        }),
      },
    },
    rows,
  };
};

describe("AmplifyArtifactStore", () => {
  it("creates JSON-only artifact rows scoped to owner/thread/kind", async () => {
    const client = createClient();
    const store = new AmplifyArtifactStore(client, {
      idFactory: () => "artifact-1",
      now: () => new Date("2026-05-15T00:00:00.000Z"),
    });

    const saved = await store.putArtifact(
      {
        customerSlug: "prairie-water",
        kind: "field-brief",
        payload: { title: "Brief" },
        payloadVersion: 1,
        status: "ready",
        threadId: "thread-1",
        title: "Brief",
      },
      owner,
    );

    expect(saved.id).toBe("artifact-1");
    expect(saved.ownerUserId).toBe("user-a");
    expect(client.models.Artifact.create).toHaveBeenCalledWith(
      expect.not.objectContaining({
        markdownStoragePath: expect.anything(),
        pdfStoragePath: expect.anything(),
      }),
    );
  });

  it("does not treat failed artifacts as active downloads", async () => {
    const client = createClient([
      {
        createdAtIso: "2026-05-15T00:00:00.000Z",
        customerSlug: "prairie-water",
        id: "artifact-1",
        kind: "field-brief",
        payload: { title: "Failed" },
        payloadVersion: 1,
        status: "failed",
        threadId: "thread-1",
        title: "Failed",
        updatedAtIso: "2026-05-15T00:00:00.000Z",
        userId: "user-a",
      },
    ]);
    const store = new AmplifyArtifactStore(client);

    await expect(store.getActiveArtifact("thread-1", "field-brief", owner)).resolves.toBeNull();
  });

  it("records failed attempts without replacing the active ready artifact", async () => {
    const client = createClient([
      {
        createdAtIso: "2026-05-15T00:00:00.000Z",
        customerSlug: "prairie-water",
        id: "artifact-1",
        kind: "field-brief",
        payload: { title: "Ready" },
        payloadVersion: 1,
        status: "ready",
        threadId: "thread-1",
        title: "Ready",
        updatedAtIso: "2026-05-15T00:00:00.000Z",
        userId: "user-a",
      },
    ]);
    const store = new AmplifyArtifactStore(client, {
      idFactory: () => "artifact-failed",
      now: () => new Date("2026-05-15T00:01:00.000Z"),
    });

    await store.putArtifact(
      {
        kind: "field-brief",
        payload: { title: "Failed" },
        payloadVersion: 1,
        status: "failed",
        threadId: "thread-1",
        title: "Failed",
      },
      owner,
    );

    expect(client.models.Artifact.create).toHaveBeenCalledWith(
      expect.objectContaining({ id: "artifact-failed", status: "failed" }),
    );
    expect(client.models.Artifact.update).not.toHaveBeenCalled();
    await expect(store.getActiveArtifact("thread-1", "field-brief", owner)).resolves.toMatchObject({
      id: "artifact-1",
      status: "ready",
      title: "Ready",
    });
  });

  it("updates the existing active row for replacement semantics", async () => {
    const client = createClient([
      {
        createdAtIso: "2026-05-15T00:00:00.000Z",
        customerSlug: "prairie-water",
        id: "artifact-1",
        kind: "field-brief",
        payload: { title: "Old" },
        payloadVersion: 1,
        status: "ready",
        threadId: "thread-1",
        title: "Old",
        updatedAtIso: "2026-05-15T00:00:00.000Z",
        userId: "user-a",
      },
    ]);
    const store = new AmplifyArtifactStore(client, {
      now: () => new Date("2026-05-15T00:01:00.000Z"),
    });

    const saved = await store.putArtifact(
      {
        kind: "field-brief",
        payload: { title: "New" },
        payloadVersion: 1,
        status: "ready",
        threadId: "thread-1",
        title: "New",
      },
      owner,
    );

    expect(saved.id).toBe("artifact-1");
    expect(saved.title).toBe("New");
    expect(client.models.Artifact.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: "artifact-1", title: "New" }),
    );
  });
});
