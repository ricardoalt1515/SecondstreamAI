import { GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { describe, expect, it, vi } from "vitest";
import type { OwnerContext } from "@/lib/auth/owner-context";
import { createLambdaDynamoDbArtifactStore } from "./lambda-artifact-store";

const owner: OwnerContext = { identityId: "identity-a", userId: "user-a" };

describe("LambdaDynamoDbArtifactStore", () => {
  it("stores ready artifacts at the deterministic active key", async () => {
    const send = vi.fn(async () => ({}));
    const store = createLambdaDynamoDbArtifactStore({
      artifactTableName: "ArtifactTable",
      client: { send },
      now: () => new Date("2026-05-15T00:00:00.000Z"),
    });

    await store.putArtifact(
      {
        kind: "field-brief",
        payload: { title: "Brief" },
        payloadVersion: 1,
        status: "ready",
        threadId: "thread-1",
        title: "Brief",
      },
      owner,
    );

    expect(send).toHaveBeenCalledWith(expect.any(PutItemCommand));
    const [command] = send.mock.calls.at(0) as unknown as [PutItemCommand];
    expect(JSON.stringify(command.input)).toContain("user-a#thread-1#field-brief");
    expect(command.input.Item?.owner).toEqual({ S: "user-a::user-a" });
    expect(command.input.Item?.createdAt).toEqual({ S: "2026-05-15T00:00:00.000Z" });
    expect(command.input.Item?.updatedAt).toEqual({ S: "2026-05-15T00:00:00.000Z" });
  });

  it("loads only ready artifacts for the active key", async () => {
    const send = vi.fn(async () => ({
      Item: {
        id: { S: "user-a#thread-1#field-brief" },
        userId: { S: "user-a" },
        ownerIdentityId: { S: "identity-a" },
        threadId: { S: "thread-1" },
        kind: { S: "field-brief" },
        status: { S: "ready" },
        title: { S: "Brief" },
        payloadVersion: { N: "1" },
        payload: { M: { title: { S: "Brief" } } },
        createdAtIso: { S: "2026-05-15T00:00:00.000Z" },
        updatedAtIso: { S: "2026-05-15T00:00:00.000Z" },
      },
    }));
    const store = createLambdaDynamoDbArtifactStore({
      artifactTableName: "ArtifactTable",
      client: { send },
    });

    const artifact = await store.getActiveArtifact("thread-1", "field-brief", owner);

    expect(send).toHaveBeenCalledWith(expect.any(GetItemCommand));
    expect(artifact).toMatchObject({ id: "user-a#thread-1#field-brief", status: "ready" });
  });
});
