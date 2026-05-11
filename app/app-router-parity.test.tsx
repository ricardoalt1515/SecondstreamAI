import * as React from "react";
import { describe, expect, it, vi } from "vitest";

vi.stubGlobal("React", React);

vi.mock("@/components/chat-interface", () => ({
  ChatInterface: (props: { initialMessages: unknown[]; threadId: string }) => ({
    type: "ChatInterface",
    props,
  }),
}));

vi.mock("@app/actions/messages", () => ({
  getThreadMessages: vi.fn(async () => ({
    messages: [{ id: "message-1", role: "user", parts: [{ type: "text", text: "hello" }] }],
  })),
}));

vi.mock("@/lib/auth/server", () => ({
  getCurrentOwner: vi.fn(async () => ({ userId: "user-id", identityId: "identity-id" })),
}));

vi.mock("@/lib/storage/chat-store", () => ({
  getChatStore: vi.fn(async () => ({
    getThreadById: vi.fn(async () => ({
      id: "thread-1",
      resourceId: "user-id",
      title: "Thread",
      createdAt: "2026-05-07T00:00:00.000Z",
      updatedAt: "2026-05-07T00:00:00.000Z",
    })),
    getThreadMessages: vi.fn(async () => [
      { id: "message-1", role: "user", parts: [{ type: "text", text: "hello" }] },
    ]),
  })),
}));

describe("App Router route parity", () => {
  it("renders the root workspace with a new thread id and empty initial history", async () => {
    const { default: Page } = await import("./page");

    const element = Page() as { props: { initialMessages: unknown[]; threadId: string } };

    expect(element.props.initialMessages).toEqual([]);
    expect(element.props.threadId).toEqual(expect.any(String));
  });

  it("loads thread workspace messages server-side before rendering ChatInterface", async () => {
    const { default: ThreadPage } = await import("./c/[threadId]/page");

    const element = (await ThreadPage({
      params: Promise.resolve({ threadId: "thread-1" }),
    })) as { props: { initialMessages: unknown[]; threadId: string } };

    expect(element.props.threadId).toBe("thread-1");
    expect(element.props.initialMessages).toHaveLength(1);
  });
});
