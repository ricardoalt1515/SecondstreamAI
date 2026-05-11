import type { ToolLoopAgent, UIMessage } from "ai";
import { describe, expect, it, vi } from "vitest";
import type { BlobStore } from "@/lib/storage/blob-store";
import type { ChatStore } from "@/lib/storage/chat-store";

type MockStreamWriter = {
  write: () => void;
  merge: () => void;
};

type MockAgentStreamOptions = {
  messages?: UIMessage[];
  onFinish?: (result: {
    text: string;
    model: string;
    finishReason: string;
    usage: { promptTokens: number; completionTokens: number };
  }) => Promise<void> | void;
};

type MockUIStreamOptions = {
  onFinish?: (result: {
    responseMessage: UIMessage;
    messages?: UIMessage[];
    isContinuation?: boolean;
    isAborted?: boolean;
  }) => Promise<void> | void;
};

// Mock the ai module
vi.mock("ai", () => ({
  convertToModelMessages: vi.fn(async (messages: unknown[]) => messages),
  createUIMessageStream: vi.fn(
    ({ execute }: { execute: (arg: { writer: MockStreamWriter }) => Promise<void> }) => {
      const stream = new ReadableStream({
        async start(controller) {
          await execute({
            writer: {
              write: () => undefined,
              merge: () => undefined,
            },
          });
          controller.close();
        },
      });

      return stream;
    },
  ),
  createUIMessageStreamResponse: vi.fn(
    ({ stream }: { stream: ReadableStream }) => new Response(stream, { status: 200 }),
  ),
  generateText: vi.fn(),
  validateUIMessages: vi.fn(async ({ messages }: { messages: unknown[] }) => messages),
}));

// Create a mock agent factory
const createMockAgent = (responseText: string): ToolLoopAgent => {
  return {
    stream: vi.fn().mockImplementation(async ({ onFinish }: MockAgentStreamOptions) => {
      await onFinish?.({
        text: responseText,
        model: "anthropic.claude-sonnet-4-6-v1",
        finishReason: "stop",
        usage: { promptTokens: 100, completionTokens: 50 },
      });

      return {
        toUIMessageStream: ({ onFinish: onUiFinish }: MockUIStreamOptions = {}) =>
          new ReadableStream({
            async start(controller) {
              await onUiFinish?.({
                responseMessage: {
                  id: "assistant-1",
                  role: "assistant",
                  parts: [{ type: "text", text: responseText }],
                },
                messages: [],
                isContinuation: false,
                isAborted: false,
              });
              controller.close();
            },
          }),
      };
    }),
  } as unknown as ToolLoopAgent;
};

const { createChatPostHandler } = await import("@/lib/chat-handler");

type TestMessage = UIMessage;

const buildRequest = (payload: unknown): Request =>
  new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

const getTestOwner = vi.fn(async () => ({ userId: "user-id", identityId: "identity-id" }));

describe("api/chat handler", () => {
  it("persiste mensaje de usuario y respuesta final de asistente", async () => {
    const saveMessage = vi.fn<ChatStore["saveMessage"]>().mockResolvedValue(undefined);
    const getThreadById = vi
      .fn<ChatStore["getThreadById"]>()
      .mockResolvedValueOnce(null)
      .mockResolvedValue({
        id: "thread-1",
        resourceId: "user-id",
        title: "New Chat",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

    const store = {
      saveMessage,
      getThreadById,
      createThread: vi.fn<ChatStore["createThread"]>().mockResolvedValue({
        id: "thread-1",
        resourceId: "user-id",
        title: "New Chat",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      updateThreadTitle: vi.fn<ChatStore["updateThreadTitle"]>().mockResolvedValue(undefined),
      getThreadMessages: vi.fn<ChatStore["getThreadMessages"]>().mockResolvedValue([]),
      listThreads: vi.fn<ChatStore["listThreads"]>().mockResolvedValue([]),
      deleteThread: vi.fn<ChatStore["deleteThread"]>().mockResolvedValue(undefined),
      replaceAssistantMessageAfter: vi
        .fn<ChatStore["replaceAssistantMessageAfter"]>()
        .mockResolvedValue(undefined),
      cloneThread: vi.fn<ChatStore["cloneThread"]>().mockResolvedValue({
        id: "thread-2",
        resourceId: "user-id",
        title: "cloned",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    } satisfies ChatStore;

    const blobStore = {
      put: vi.fn<BlobStore["put"]>().mockResolvedValue({
        key: "secondstream/attachments/thread-1/file.txt",
        url: "https://bucket.s3.us-east-1.amazonaws.com/secondstream/attachments/thread-1/file.txt",
        sizeBytes: 4,
      }),
      get: vi.fn<BlobStore["get"]>().mockResolvedValue(Buffer.from("test", "utf8")),
      delete: vi.fn<BlobStore["delete"]>().mockResolvedValue(undefined),
    } satisfies BlobStore;

    const generateText = vi.fn().mockResolvedValue({ text: "Título generado" });
    const mockAgent = createMockAgent("respuesta final");

    const handler = createChatPostHandler({
      chatStore: store,
      blobStore,
      agent: mockAgent,
      generateText,
      getOwner: getTestOwner,
    });

    const response = await handler({
      request: buildRequest({
        threadId: "thread-1",
        modelId: "claude-sonnet-4-6",
        messages: [
          {
            id: "u-1",
            role: "user",
            parts: [{ type: "text", text: "hola" }],
          } satisfies TestMessage,
        ],
      }),
    });

    await response.text();

    expect(response.status).toBe(200);
    expect(mockAgent.stream).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            role: "user",
            parts: [{ type: "text", text: "hola" }],
          }),
        ],
      }),
    );
    expect(saveMessage).toHaveBeenCalledTimes(2);
    expect(generateText).toHaveBeenCalledTimes(1);
  });

  it("en regeneración reemplaza mensaje asistente en vez de duplicar", async () => {
    const replaceAssistantMessageAfter = vi
      .fn<ChatStore["replaceAssistantMessageAfter"]>()
      .mockResolvedValue(undefined);

    const store = {
      saveMessage: vi.fn<ChatStore["saveMessage"]>().mockResolvedValue(undefined),
      getThreadById: vi.fn<ChatStore["getThreadById"]>().mockResolvedValue({
        id: "thread-1",
        resourceId: "user-id",
        title: "Título",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      createThread: vi.fn<ChatStore["createThread"]>().mockResolvedValue({
        id: "thread-1",
        resourceId: "user-id",
        title: "Título",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      updateThreadTitle: vi.fn<ChatStore["updateThreadTitle"]>().mockResolvedValue(undefined),
      getThreadMessages: vi.fn<ChatStore["getThreadMessages"]>().mockResolvedValue([
        {
          id: "u-1",
          role: "user",
          parts: [{ type: "text", text: "hola" }],
        },
        {
          id: "a-1",
          role: "assistant",
          parts: [{ type: "text", text: "respuesta vieja" }],
        },
      ]),
      listThreads: vi.fn<ChatStore["listThreads"]>().mockResolvedValue([]),
      deleteThread: vi.fn<ChatStore["deleteThread"]>().mockResolvedValue(undefined),
      replaceAssistantMessageAfter,
      cloneThread: vi.fn<ChatStore["cloneThread"]>().mockResolvedValue({
        id: "thread-2",
        resourceId: "user-id",
        title: "cloned",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    } satisfies ChatStore;

    const blobStore = {
      put: vi.fn<BlobStore["put"]>().mockResolvedValue({
        key: "secondstream/attachments/thread-1/file.txt",
        url: "https://bucket.s3.us-east-1.amazonaws.com/secondstream/attachments/thread-1/file.txt",
        sizeBytes: 4,
      }),
      get: vi.fn<BlobStore["get"]>().mockResolvedValue(Buffer.from("test", "utf8")),
      delete: vi.fn<BlobStore["delete"]>().mockResolvedValue(undefined),
    } satisfies BlobStore;

    const mockAgent = createMockAgent("respuesta nueva");

    const handler = createChatPostHandler({
      chatStore: store,
      blobStore,
      agent: mockAgent,
      generateText: vi.fn().mockResolvedValue({ text: "titulo" }),
      getOwner: getTestOwner,
    });

    const response = await handler({
      request: buildRequest({
        threadId: "thread-1",
        modelId: "claude-sonnet-4-6",
        trigger: "regenerate-message",
        messageId: "a-1",
        messages: [
          {
            id: "u-1",
            role: "user",
            parts: [{ type: "text", text: "hola" }],
          } satisfies TestMessage,
        ],
      }),
    });

    await response.text();

    expect(replaceAssistantMessageAfter).toHaveBeenCalledWith(
      "thread-1",
      "a-1",
      expect.objectContaining({
        role: "assistant",
        parts: [{ type: "text", text: "respuesta nueva" }],
      }),
    );
    expect(store.saveMessage).toHaveBeenCalledTimes(0);
  });

  it("si falla generación no persiste respuesta parcial de asistente", async () => {
    const saveMessage = vi.fn<ChatStore["saveMessage"]>().mockResolvedValue(undefined);
    const replaceAssistantMessageAfter = vi
      .fn<ChatStore["replaceAssistantMessageAfter"]>()
      .mockResolvedValue(undefined);

    const store = {
      saveMessage,
      getThreadById: vi.fn<ChatStore["getThreadById"]>().mockResolvedValue({
        id: "thread-1",
        resourceId: "user-id",
        title: "Título",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      createThread: vi.fn<ChatStore["createThread"]>().mockResolvedValue({
        id: "thread-1",
        resourceId: "user-id",
        title: "Título",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      updateThreadTitle: vi.fn<ChatStore["updateThreadTitle"]>().mockResolvedValue(undefined),
      getThreadMessages: vi.fn<ChatStore["getThreadMessages"]>().mockResolvedValue([]),
      listThreads: vi.fn<ChatStore["listThreads"]>().mockResolvedValue([]),
      deleteThread: vi.fn<ChatStore["deleteThread"]>().mockResolvedValue(undefined),
      replaceAssistantMessageAfter,
      cloneThread: vi.fn<ChatStore["cloneThread"]>().mockResolvedValue({
        id: "thread-2",
        resourceId: "user-id",
        title: "cloned",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    } satisfies ChatStore;

    const blobStore = {
      put: vi.fn<BlobStore["put"]>().mockResolvedValue({
        key: "secondstream/attachments/thread-1/file.txt",
        url: "https://bucket.s3.us-east-1.amazonaws.com/secondstream/attachments/thread-1/file.txt",
        sizeBytes: 4,
      }),
      get: vi.fn<BlobStore["get"]>().mockResolvedValue(Buffer.from("test", "utf8")),
      delete: vi.fn<BlobStore["delete"]>().mockResolvedValue(undefined),
    } satisfies BlobStore;

    const mockAgent = {
      stream: vi.fn().mockRejectedValue(new Error("bedrock timeout")),
    } as unknown as ToolLoopAgent;

    const handler = createChatPostHandler({
      chatStore: store,
      blobStore,
      agent: mockAgent,
      generateText: vi.fn().mockResolvedValue({ text: "titulo" }),
      getOwner: getTestOwner,
    });

    const response = await handler({
      request: buildRequest({
        threadId: "thread-1",
        modelId: "claude-sonnet-4-6",
        messages: [
          {
            id: "u-1",
            role: "user",
            parts: [{ type: "text", text: "hola" }],
          } satisfies TestMessage,
        ],
      }),
    });

    await response.text();

    expect(saveMessage).toHaveBeenCalledTimes(1);
    expect(replaceAssistantMessageAfter).not.toHaveBeenCalled();
  });

  it("persiste respuesta de tool generateDiscoveryReportBundle cuando hay resultado", async () => {
    const saveMessage = vi.fn<ChatStore["saveMessage"]>().mockResolvedValue(undefined);
    const store = {
      saveMessage,
      getThreadById: vi
        .fn<ChatStore["getThreadById"]>()
        .mockResolvedValueOnce(null)
        .mockResolvedValue({
          id: "thread-1",
          resourceId: "user-id",
          title: "New Chat",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      createThread: vi.fn<ChatStore["createThread"]>().mockResolvedValue({
        id: "thread-1",
        resourceId: "user-id",
        title: "New Chat",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      updateThreadTitle: vi.fn<ChatStore["updateThreadTitle"]>().mockResolvedValue(undefined),
      getThreadMessages: vi.fn<ChatStore["getThreadMessages"]>().mockResolvedValue([]),
      listThreads: vi.fn<ChatStore["listThreads"]>().mockResolvedValue([]),
      deleteThread: vi.fn<ChatStore["deleteThread"]>().mockResolvedValue(undefined),
      replaceAssistantMessageAfter: vi
        .fn<ChatStore["replaceAssistantMessageAfter"]>()
        .mockResolvedValue(undefined),
      cloneThread: vi.fn<ChatStore["cloneThread"]>().mockResolvedValue({
        id: "thread-2",
        resourceId: "user-id",
        title: "cloned",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    } satisfies ChatStore;

    const blobStore = {
      put: vi.fn<BlobStore["put"]>().mockResolvedValue({
        key: "secondstream/attachments/thread-1/file.txt",
        url: "https://bucket.s3.us-east-1.amazonaws.com/secondstream/attachments/thread-1/file.txt",
        sizeBytes: 4,
      }),
      get: vi.fn<BlobStore["get"]>().mockResolvedValue(Buffer.from("test", "utf8")),
      delete: vi.fn<BlobStore["delete"]>().mockResolvedValue(undefined),
    } satisfies BlobStore;

    const mockAgent = {
      stream: vi.fn().mockImplementation(async () => ({
        toUIMessageStream: ({ onFinish }: MockUIStreamOptions = {}) =>
          new ReadableStream({
            async start(controller) {
              await onFinish?.({
                responseMessage: {
                  id: "assistant-1",
                  role: "assistant",
                  parts: [
                    {
                      type: "tool-generateDiscoveryReportBundle",
                      toolCallId: "tool-call-1",
                      state: "output-available",
                      input: {},
                      output: {
                        snapshotInline: "Snapshot inline",
                        presentFiles: [
                          {
                            filename: "report.pdf",
                            mediaType: "application/pdf",
                            url: "https://example/report.pdf",
                          },
                        ],
                        manifest: {
                          bundleId: "bundle-1",
                          files: [],
                        },
                      },
                    },
                  ],
                },
                messages: [],
                isContinuation: false,
                isAborted: false,
              });

              controller.close();
            },
          }),
      })),
    } as unknown as ToolLoopAgent;

    const handler = createChatPostHandler({
      chatStore: store,
      blobStore,
      agent: mockAgent,
      generateText: vi.fn().mockResolvedValue({ text: "titulo" }),
      getOwner: getTestOwner,
    });

    const response = await handler({
      request: buildRequest({
        threadId: "thread-1",
        modelId: "claude-sonnet-4-6",
        messages: [
          {
            id: "u-1",
            role: "user",
            parts: [{ type: "text", text: "genera reporte" }],
          } satisfies TestMessage,
        ],
      }),
    });

    await response.text();

    expect(saveMessage).toHaveBeenCalledTimes(2);
    expect(saveMessage).toHaveBeenLastCalledWith(
      "thread-1",
      expect.objectContaining({
        role: "assistant",
        parts: expect.arrayContaining([
          expect.objectContaining({
            type: "tool-generateDiscoveryReportBundle",
            state: "output-available",
          }),
        ]),
      }),
    );
  });

  it("rejects access to a thread owned by another authenticated user", async () => {
    const store = {
      saveMessage: vi.fn<ChatStore["saveMessage"]>().mockResolvedValue(undefined),
      getThreadById: vi.fn<ChatStore["getThreadById"]>().mockResolvedValue({
        id: "thread-1",
        resourceId: "other-user-id",
        title: "Other user's thread",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      createThread: vi.fn<ChatStore["createThread"]>(),
      updateThreadTitle: vi.fn<ChatStore["updateThreadTitle"]>(),
      getThreadMessages: vi.fn<ChatStore["getThreadMessages"]>().mockResolvedValue([]),
      listThreads: vi.fn<ChatStore["listThreads"]>().mockResolvedValue([]),
      deleteThread: vi.fn<ChatStore["deleteThread"]>().mockResolvedValue(undefined),
      replaceAssistantMessageAfter: vi.fn<ChatStore["replaceAssistantMessageAfter"]>(),
      cloneThread: vi.fn<ChatStore["cloneThread"]>(),
    } satisfies ChatStore;

    const blobStore = {
      put: vi.fn<BlobStore["put"]>(),
      get: vi.fn<BlobStore["get"]>(),
      delete: vi.fn<BlobStore["delete"]>(),
    } satisfies BlobStore;

    const handler = createChatPostHandler({
      chatStore: store,
      blobStore,
      agent: createMockAgent("should not run"),
      generateText: vi.fn().mockResolvedValue({ text: "titulo" }),
      getOwner: getTestOwner,
    });

    const response = await handler({
      request: buildRequest({
        threadId: "thread-1",
        modelId: "claude-sonnet-4-6",
        messages: [
          {
            id: "u-1",
            role: "user",
            parts: [{ type: "text", text: "hola" }],
          } satisfies TestMessage,
        ],
      }),
    });

    expect(response.status).toBe(404);
    expect(response.headers.get("x-error-code")).toBe("THREAD_NOT_FOUND");
    expect(store.saveMessage).not.toHaveBeenCalled();
  });
});
