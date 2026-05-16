import { fetchAuthSession } from "aws-amplify/auth";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { parseChatRequest } from "@/lib/chat-helpers";
import { canSubmitPromptMessage } from "@/lib/chat-utils";
import type { MyUIMessage } from "@/types/ui-message";
import {
  ChatRuntimeError,
  getChatTransportApi,
  prepareChatSendMessagesRequest,
} from "./chat-interface";

vi.mock("aws-amplify/auth", () => ({
  fetchAuthSession: vi.fn(),
}));

const fetchAuthSessionMock = vi.mocked(fetchAuthSession);

describe("canSubmitPromptMessage", () => {
  it("bloquea envío cuando no hay texto ni adjuntos", () => {
    expect(
      canSubmitPromptMessage({
        text: "   ",
        files: [],
      }),
    ).toBe(false);
  });

  it("permite envío cuando hay texto", () => {
    expect(
      canSubmitPromptMessage({
        text: "Hola",
        files: [],
      }),
    ).toBe(true);
  });

  it("permite envío cuando solo hay adjuntos", () => {
    expect(
      canSubmitPromptMessage({
        text: "",
        files: [
          {
            type: "file",
            mediaType: "text/plain",
            url: "data:text/plain;base64,QQ==",
            filename: "notes.txt",
          },
        ],
      }),
    ).toBe(true);
  });
});

describe("chat transport configuration", () => {
  it("uses the production Lambda Function URL by default", () => {
    expect(getChatTransportApi()).toBe(
      "https://i2bquluu4ttmvzpuxva665dlye0tnunw.lambda-url.us-east-1.on.aws/",
    );
  });
});

describe("prepareChatSendMessagesRequest", () => {
  it("serializes AI SDK v6 send options into the chat route payload contract", async () => {
    fetchAuthSessionMock.mockResolvedValueOnce({
      tokens: {
        accessToken: { toString: () => "access-token" },
      },
    } as Awaited<ReturnType<typeof fetchAuthSession>>);
    const messages: MyUIMessage[] = [
      {
        id: "message-1",
        role: "user",
        parts: [{ type: "text", text: "Draft a hearing summary" }],
      },
    ];

    const prepared = await prepareChatSendMessagesRequest({
      body: {
        threadId: "thread-1",
        modelId: "claude-sonnet-4-6",
        webSearchEnabled: false,
      },
      messageId: undefined,
      messages,
      trigger: "submit-message",
    });

    expect(prepared.body).toEqual({
      threadId: "thread-1",
      messages,
      trigger: "submit-message",
      messageId: undefined,
      modelId: "claude-sonnet-4-6",
      webSearchEnabled: false,
    });
    expect(parseChatRequest(prepared.body).threadId).toBe("thread-1");
  });

  it("adds a Cognito access-token Authorization header", async () => {
    fetchAuthSessionMock.mockResolvedValueOnce({
      tokens: {
        accessToken: { toString: () => "access-token" },
      },
    } as Awaited<ReturnType<typeof fetchAuthSession>>);
    const messages: MyUIMessage[] = [
      {
        id: "message-1",
        role: "user",
        parts: [{ type: "text", text: "Hello" }],
      },
    ];

    const prepared = await prepareChatSendMessagesRequest({
      body: {
        threadId: "thread-1",
        modelId: "claude-sonnet-4-6",
      },
      messageId: undefined,
      messages,
      trigger: "submit-message",
    });

    expect(prepared.headers).toEqual({ authorization: "Bearer access-token" });
    expect(prepared.body).toMatchObject({ threadId: "thread-1", messages });
  });

  it("preserves regenerate message ids for server-side regeneration", async () => {
    fetchAuthSessionMock.mockResolvedValueOnce({
      tokens: {
        accessToken: { toString: () => "access-token" },
      },
    } as Awaited<ReturnType<typeof fetchAuthSession>>);
    const messages: MyUIMessage[] = [
      {
        id: "message-1",
        role: "user",
        parts: [{ type: "text", text: "Try again" }],
      },
    ];

    const prepared = await prepareChatSendMessagesRequest({
      body: { threadId: "thread-1", modelId: "claude-sonnet-4-6" },
      messageId: "assistant-1",
      messages,
      trigger: "regenerate-message",
    });

    expect(prepared.body).toMatchObject({
      threadId: "thread-1",
      messageId: "assistant-1",
      trigger: "regenerate-message",
      webSearchEnabled: false,
    });
    expect(parseChatRequest(prepared.body).regenerateMessageId).toBe("assistant-1");
  });
});

describe("ChatRuntimeError", () => {
  it("renders server/model failures as a visible alert", () => {
    const markup = renderToStaticMarkup(
      <ChatRuntimeError message="Amplify outputs are not configured" />,
    );

    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Chat request failed");
    expect(markup).toContain("Amplify outputs are not configured");
  });
});
