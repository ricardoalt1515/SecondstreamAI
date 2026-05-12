import { describe, expect, it } from "vitest";
import {
  ensureServerMessageId,
  extractLastUserMessage,
  isStableThreadTitle,
  toBedrockModelId,
} from "@/lib/chat-runtime";

describe("chat-runtime", () => {
  it("convierte provider/model a model id de Bedrock", () => {
    expect(toBedrockModelId("amazon-bedrock/us.anthropic.claude-sonnet-4-6")).toBe(
      "us.anthropic.claude-sonnet-4-6",
    );
  });

  it("mantiene id existente del mensaje", () => {
    const message = ensureServerMessageId({
      id: "m-1",
      role: "user",
      parts: [{ type: "text", text: "hola" }],
    });

    expect(message.id).toBe("m-1");
  });

  it("genera id server-side cuando falta", () => {
    const message = ensureServerMessageId({
      role: "assistant",
      parts: [{ type: "text", text: "respuesta" }],
    });

    expect(message.id.length).toBeGreaterThan(0);
  });

  it("genera id server-side cuando AI SDK entrega id vacío", () => {
    const message = ensureServerMessageId({
      id: "",
      role: "assistant",
      parts: [{ type: "text", text: "respuesta" }],
    });

    expect(message.id.length).toBeGreaterThan(0);
  });

  it("encuentra el último mensaje de usuario", () => {
    const last = extractLastUserMessage([
      { id: "a-1", role: "assistant", parts: [{ type: "text", text: "x" }] },
      { id: "u-1", role: "user", parts: [{ type: "text", text: "y" }] },
    ]);

    expect(last?.id).toBe("u-1");
  });

  it("detecta título estable distinto de New Chat", () => {
    expect(isStableThreadTitle("New Chat")).toBe(false);
    expect(isStableThreadTitle("Resumen Q2")).toBe(true);
  });
});
