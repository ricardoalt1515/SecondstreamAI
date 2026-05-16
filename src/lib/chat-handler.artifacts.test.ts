import type { UIMessage } from "ai";
import { describe, expect, it, vi } from "vitest";
import type { Agent } from "@/ai/agents/agent";
import type { ArtifactStore } from "@/lib/artifacts/artifact-store";
import { InMemoryArtifactPdfStorage } from "@/lib/artifacts/pdf-storage";
import type { BlobStore } from "@/lib/storage/blob-store";
import type { ChatStore } from "@/lib/storage/chat-store";

vi.mock("ai", () => ({
  convertToModelMessages: vi.fn(async (messages: unknown[]) => messages),
  createUIMessageStream: vi.fn(
    ({
      execute,
    }: {
      execute: (arg: {
        writer: { write: (chunk: unknown) => void; merge: () => void };
      }) => Promise<void>;
    }) => {
      const stream = new ReadableStream({
        async start(controller) {
          await execute({ writer: { write: vi.fn(), merge: vi.fn() } });
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
  tool: vi.fn((config: unknown) => config),
  validateUIMessages: vi.fn(async ({ messages }: { messages: unknown[] }) => messages),
  // Required because chat-handler now imports H2O_AGENT_INSTRUCTIONS from
  // agent.ts as a value, forcing agent module evaluation in this test.
  stepCountIs: vi.fn((count: number) => ({ __stopAt: count })),
  ToolLoopAgent: vi.fn(() => ({})),
}));

const { createChatPostHandler } = await import("./chat-handler");

const owner = { identityId: "identity-id", userId: "user-id" };

const buildRequest = (text: string): Request =>
  new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      threadId: "thread-1",
      messages: [{ id: "message-1", role: "user", parts: [{ type: "text", text }] }],
      trigger: "submit-message",
      messageId: "message-1",
      modelId: "claude-sonnet-4-6",
      webSearchEnabled: false,
    }),
  });

const createChatStore = (): ChatStore => ({
  createThread: vi.fn(async (id, resourceId, title) => ({
    id,
    resourceId,
    title,
    createdAt: "2026-05-15T00:00:00.000Z",
    updatedAt: "2026-05-15T00:00:00.000Z",
  })),
  cloneThread: vi.fn(),
  deleteThread: vi.fn(),
  getThreadById: vi.fn(async () => ({
    id: "thread-1",
    resourceId: owner.userId,
    title: "Existing",
    createdAt: "2026-05-15T00:00:00.000Z",
    updatedAt: "2026-05-15T00:00:00.000Z",
  })),
  getThreadMessages: vi.fn(async () => []),
  listThreads: vi.fn(),
  replaceAssistantMessageAfter: vi.fn(),
  saveMessage: vi.fn(),
  updateThreadTitle: vi.fn(),
});

const blobStore: BlobStore = {
  delete: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
};

const artifactStore: ArtifactStore = {
  getActiveArtifact: vi.fn(),
  listArtifactsByThread: vi.fn(),
  putArtifact: vi.fn(),
};

const createAgent = (messagesSeen: unknown[]): ((input: unknown) => Agent) =>
  vi.fn(
    (_input) =>
      ({
        stream: vi.fn(async ({ messages }: { messages: UIMessage[] }) => {
          messagesSeen.push(...messages);
          return {
            toUIMessageStream: ({
              onFinish,
            }: {
              onFinish?: (arg: { responseMessage: UIMessage }) => void;
            } = {}) =>
              new ReadableStream({
                start(controller) {
                  onFinish?.({
                    responseMessage: {
                      id: "assistant-1",
                      role: "assistant",
                      parts: [{ type: "text", text: "Done" }],
                    },
                  });
                  controller.close();
                },
              }),
          };
        }),
      }) as unknown as Agent,
  );

describe("chat handler artifact wiring", () => {
  it("builds request-scoped artifact tools and injects a server-authored trigger reminder", async () => {
    const messagesSeen: unknown[] = [];
    const agentFactory = createAgent(messagesSeen);
    const handler = createChatPostHandler({
      artifactStore,
      pdfStorage: new InMemoryArtifactPdfStorage(),
      blobStore,
      chatStore: createChatStore(),
      createAgent: agentFactory,
      generateText: vi.fn().mockResolvedValue({ text: "title" }),
      getOwner: async () => owner,
    });

    const response = await handler({ request: buildRequest("What should I do here?") });
    await response.arrayBuffer();

    expect(agentFactory).toHaveBeenCalledWith(
      expect.objectContaining({
        artifactContext: expect.objectContaining({ owner, threadId: "thread-1" }),
        tools: expect.objectContaining({
          generateFieldBrief: expect.anything(),
          generatePlaybook: expect.anything(),
          generateAnalyticalRead: expect.anything(),
          generateProposalShell: expect.anything(),
        }),
      }),
    );
    expect(JSON.stringify(messagesSeen)).toContain("triggerPhraseMatched: true");
    expect(JSON.stringify(messagesSeen)).toContain("generateFieldBrief");
    expect(JSON.stringify(messagesSeen)).toContain("in parallel");
  });
});
