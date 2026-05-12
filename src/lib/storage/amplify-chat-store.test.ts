import { describe, expect, it, vi } from "vitest";
import { AmplifyChatStore } from "./amplify-chat-store";

const createMockDataClient = () => ({
  models: {
    Session: {
      create: vi.fn(async (input) => ({
        data: { ...input, createdAt: "2026-05-07T00:00:00.000Z" },
      })),
      get: vi.fn(async () => ({ data: null })),
      update: vi.fn(async (input) => ({ data: input })),
      delete: vi.fn(async (input) => ({ data: input })),
      list: vi.fn(async () => ({ data: [] })),
    },
    Message: {
      create: vi.fn(async (input) => ({ data: input })),
      get: vi.fn(async () => ({ data: null })),
      update: vi.fn(async (input) => ({ data: input })),
      delete: vi.fn(async (input) => ({ data: input })),
      list: vi.fn(async () => ({ data: [] })),
      listMessageBySessionId: undefined as
        | undefined
        | ReturnType<typeof vi.fn<(input: { sessionId: string }) => Promise<{ data: unknown[] }>>>,
    },
    File: {
      create: vi.fn(async (input) => ({ data: input })),
      get: vi.fn(async () => ({ data: null })),
      update: vi.fn(async (input) => ({ data: input })),
      delete: vi.fn(async (input) => ({ data: input })),
      list: vi.fn(async () => ({ data: [] })),
    },
    GeneratedOutput: {
      create: vi.fn(async (input) => ({ data: input })),
      get: vi.fn(async () => ({ data: null })),
      update: vi.fn(async (input) => ({ data: input })),
      delete: vi.fn(async (input) => ({ data: input })),
      list: vi.fn(async () => ({ data: [] })),
    },
  },
});

describe("AmplifyChatStore", () => {
  it("persists a session/message graph that traces records to the owner and session", async () => {
    const client = createMockDataClient();
    const store = new AmplifyChatStore(client as never);

    await store.createThread("session-1", "owner-1", "Transcript review");
    await store.saveMessage("session-1", {
      id: "message-1",
      role: "user",
      parts: [{ type: "text", text: "Draft errata from this transcript." }],
    });
    await store.saveGeneratedOutput(
      {
        id: "output-1",
        sessionId: "session-1",
        messageId: "message-1",
        storagePath: "private/identity-1/sessions/session-1/output.pdf",
        mediaType: "application/pdf",
        title: "Draft output",
      },
      { userId: "owner-1", identityId: "identity-1" },
    );

    expect(client.models.Session.create).toHaveBeenCalledWith(
      expect.objectContaining({ id: "session-1", userId: "owner-1" }),
    );
    expect(client.models.Message.create).toHaveBeenCalledWith(
      expect.objectContaining({ id: "message-1", sessionId: "session-1", position: 0 }),
    );
    const createdMessage = client.models.Message.create.mock.calls[0][0] as {
      payloadJson: unknown;
    };
    expect(typeof createdMessage.payloadJson).toBe("string");
    expect(JSON.parse(String(createdMessage.payloadJson))).toEqual(
      expect.objectContaining({ id: "message-1", role: "user" }),
    );
    expect(client.models.GeneratedOutput.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "output-1",
        sessionId: "session-1",
        messageId: "message-1",
        storagePath: "private/identity-1/sessions/session-1/output.pdf",
      }),
    );
  });

  it("filters listed sessions by authenticated owner id", async () => {
    const client = createMockDataClient();
    const store = new AmplifyChatStore(client as never);

    await store.listThreads("owner-1");

    expect(client.models.Session.list).toHaveBeenCalledWith({
      filter: { userId: { eq: "owner-1" } },
    });
  });

  it("lists file metadata by session for attachment flow verification", async () => {
    const client = createMockDataClient();
    client.models.File.list.mockResolvedValueOnce({
      data: [
        {
          id: "file-1",
          sessionId: "session-1",
          messageId: "message-1",
          storagePath: "private/identity-1/sessions/session-1/source.pdf",
          filename: "source.pdf",
          mediaType: "application/pdf",
          sizeBytes: 100,
        },
      ],
    } as never);
    const store = new AmplifyChatStore(client as never);

    const files = await store.listFiles("session-1", {
      userId: "owner-1",
      identityId: "identity-1",
    });

    expect(client.models.File.list).toHaveBeenCalledWith({
      filter: { sessionId: { eq: "session-1" } },
    });
    expect(files).toEqual([
      {
        id: "file-1",
        sessionId: "session-1",
        messageId: "message-1",
        storagePath: "private/identity-1/sessions/session-1/source.pdf",
        filename: "source.pdf",
        mediaType: "application/pdf",
        sizeBytes: 100,
      },
    ]);
  });

  it("uses the Message sessionId secondary index when available", async () => {
    const client = createMockDataClient();
    client.models.Message.listMessageBySessionId = vi.fn(async () => ({
      data: [
        {
          id: "message-1",
          sessionId: "session-1",
          position: 0,
          role: "user",
          payloadJson: {
            id: "message-1",
            role: "user",
            parts: [{ type: "text", text: "Hello" }],
          },
        },
      ],
    }));
    const store = new AmplifyChatStore(client as never);

    const messages = await store.getThreadMessages("session-1");

    expect(client.models.Message.listMessageBySessionId).toHaveBeenCalledWith({
      sessionId: "session-1",
    });
    expect(client.models.Message.list).not.toHaveBeenCalled();
    expect(messages).toEqual([
      {
        id: "message-1",
        role: "user",
        parts: [{ type: "text", text: "Hello" }],
      },
    ]);
  });

  it("parses payloadJson when Amplify returns AWSJSON as a string", async () => {
    const client = createMockDataClient();
    client.models.Message.listMessageBySessionId = vi.fn(async () => ({
      data: [
        {
          id: "message-1",
          sessionId: "session-1",
          position: 0,
          role: "user",
          payloadJson: JSON.stringify({
            id: "message-1",
            role: "user",
            parts: [{ type: "text", text: "Hello from AWSJSON" }],
          }),
        },
      ],
    }));
    const store = new AmplifyChatStore(client as never);

    await expect(store.getThreadMessages("session-1")).resolves.toEqual([
      {
        id: "message-1",
        role: "user",
        parts: [{ type: "text", text: "Hello from AWSJSON" }],
      },
    ]);
  });

  it("drops malformed payloadJson strings instead of hydrating invalid messages", async () => {
    const client = createMockDataClient();
    client.models.Message.listMessageBySessionId = vi.fn(async () => ({
      data: [
        {
          id: "message-1",
          sessionId: "session-1",
          position: 0,
          role: "user",
          payloadJson: "{not-json",
        },
      ],
    }));
    const store = new AmplifyChatStore(client as never);

    await expect(store.getThreadMessages("session-1")).resolves.toEqual([]);
  });

  it("throws when Amplify returns GraphQL errors for message creation", async () => {
    const client = createMockDataClient();
    client.models.Message.create.mockResolvedValueOnce({
      data: null,
      errors: [{ message: "Unauthorized" }],
    } as never);
    const store = new AmplifyChatStore(client as never);

    await expect(
      store.saveMessage("session-1", {
        id: "message-1",
        role: "user",
        parts: [{ type: "text", text: "Hello" }],
      }),
    ).rejects.toThrow("Message.create failed");
  });
});
