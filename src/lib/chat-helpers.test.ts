import { describe, expect, it } from "vitest";
import { MAX_ATTACHMENT_BYTES, MAX_ATTACHMENTS_PER_REQUEST } from "@/config/models";
import {
  ATTACHMENT_ERROR_CODES,
  ChatRequestValidationError,
  parseChatRequest,
} from "@/lib/chat-helpers";

const buildDataUrl = (mimeType: string, sizeInBytes: number): string => {
  const base64 = Buffer.alloc(sizeInBytes, "a").toString("base64");
  return `data:${mimeType};base64,${base64}`;
};

const baseRequest = {
  threadId: "thread-1",
  messages: [
    {
      id: "m-1",
      role: "user",
      parts: [{ type: "text", text: "hola" }],
    },
  ],
};

describe("parseChatRequest", () => {
  it("rechaza modelId fuera de catálogo", () => {
    expect(() =>
      parseChatRequest({
        ...baseRequest,
        modelId: "openrouter/openai/gpt-5",
      }),
    ).toThrowError(
      expect.objectContaining({
        code: ATTACHMENT_ERROR_CODES.invalidModel,
        statusCode: 400,
      }),
    );
  });

  it("rechaza archivo mayor a 4MB", () => {
    expect(() =>
      parseChatRequest({
        ...baseRequest,
        modelId: "claude-sonnet-4-6",
        messages: [
          {
            id: "m-1",
            role: "user",
            parts: [
              {
                type: "file",
                mediaType: "text/plain",
                filename: "too-big.txt",
                url: buildDataUrl("text/plain", MAX_ATTACHMENT_BYTES + 1),
              },
            ],
          },
        ],
      }),
    ).toThrowError(
      expect.objectContaining({
        code: ATTACHMENT_ERROR_CODES.fileTooLarge,
        statusCode: 400,
      }),
    );
  });

  it("rechaza MIME no soportado", () => {
    expect(() =>
      parseChatRequest({
        ...baseRequest,
        modelId: "claude-sonnet-4-6",
        messages: [
          {
            id: "m-1",
            role: "user",
            parts: [
              {
                type: "file",
                mediaType: "application/zip",
                filename: "archive.zip",
                url: buildDataUrl("application/zip", 1024),
              },
            ],
          },
        ],
      }),
    ).toThrowError(
      expect.objectContaining({
        code: ATTACHMENT_ERROR_CODES.unsupportedMime,
        statusCode: 400,
      }),
    );
  });

  it("rechaza payload malformado", () => {
    expect(() =>
      parseChatRequest({
        ...baseRequest,
        modelId: "claude-sonnet-4-6",
        messages: [
          {
            id: "m-1",
            role: "user",
            parts: [
              {
                type: "file",
                mediaType: "text/plain",
                filename: "bad.txt",
                url: "blob:malformed",
              },
            ],
          },
        ],
      }),
    ).toThrowError(
      expect.objectContaining({
        code: ATTACHMENT_ERROR_CODES.malformedPayload,
        statusCode: 400,
      }),
    );
  });

  it("allows PDFs when the message includes a short instruction", () => {
    const payload = parseChatRequest({
      ...baseRequest,
      modelId: "claude-sonnet-4-6",
      messages: [
        {
          id: "m-1",
          role: "user",
          parts: [
            { type: "text", text: "resume este pdf" },
            {
              type: "file",
              mediaType: "application/pdf",
              filename: "paper.pdf",
              url: buildDataUrl("application/pdf", 2048),
            },
          ],
        },
      ],
    });

    expect(payload.modelId).toBe("claude-sonnet-4-6");
  });

  it("rejects PDFs without a short instruction", () => {
    expect(() =>
      parseChatRequest({
        ...baseRequest,
        modelId: "claude-sonnet-4-6",
        messages: [
          {
            id: "m-1",
            role: "user",
            parts: [
              {
                type: "file",
                mediaType: "application/pdf",
                filename: "paper.pdf",
                url: buildDataUrl("application/pdf", 2048),
              },
            ],
          },
        ],
      }),
    ).toThrowError(
      expect.objectContaining({
        code: ATTACHMENT_ERROR_CODES.documentTextRequired,
        statusCode: 400,
      }),
    );
  });

  it("rejects PDFs when the text is in a different message", () => {
    expect(() =>
      parseChatRequest({
        ...baseRequest,
        modelId: "claude-sonnet-4-6",
        messages: [
          {
            id: "m-0",
            role: "user",
            parts: [{ type: "text", text: "este texto está en otro turno" }],
          },
          {
            id: "m-1",
            role: "user",
            parts: [
              {
                type: "file",
                mediaType: "application/pdf",
                filename: "paper.pdf",
                url: buildDataUrl("application/pdf", 2048),
              },
            ],
          },
        ],
      }),
    ).toThrowError(
      expect.objectContaining({
        code: ATTACHMENT_ERROR_CODES.documentTextRequired,
        statusCode: 400,
      }),
    );
  });

  it("acepta adjuntos válidos dentro de límites y catálogo", () => {
    const payload = parseChatRequest({
      ...baseRequest,
      modelId: "claude-sonnet-4-6",
      messages: [
        {
          id: "m-1",
          role: "user",
          parts: [
            { type: "text", text: "analiza todo" },
            {
              type: "file",
              mediaType: "text/plain",
              filename: "notes.txt",
              url: buildDataUrl("text/plain", 64),
            },
            {
              type: "file",
              mediaType: "image/png",
              filename: "image.png",
              url: buildDataUrl("image/png", 512),
            },
            {
              type: "file",
              mediaType: "application/pdf",
              filename: "doc.pdf",
              url: buildDataUrl("application/pdf", 1024),
            },
          ],
        },
      ],
    });

    expect(payload.modelId).toBe("claude-sonnet-4-6");
    expect(payload.runtimeModelId).toBe("amazon-bedrock/us.anthropic.claude-sonnet-4-6");
  });

  it("rechaza más adjuntos que el límite permitido", () => {
    const files = Array.from({ length: MAX_ATTACHMENTS_PER_REQUEST + 1 }, (_, index) => ({
      type: "file" as const,
      mediaType: "text/plain",
      filename: `f-${index}.txt`,
      url: buildDataUrl("text/plain", 10),
    }));

    expect(() =>
      parseChatRequest({
        ...baseRequest,
        modelId: "claude-sonnet-4-6",
        messages: [
          {
            id: "m-1",
            role: "user",
            parts: files,
          },
        ],
      }),
    ).toThrowError(
      expect.objectContaining({
        code: ATTACHMENT_ERROR_CODES.tooManyFiles,
        statusCode: 400,
      }),
    );
  });

  it("expone error tipado para manejo seguro", () => {
    try {
      parseChatRequest({
        ...baseRequest,
        modelId: "invalid",
      });
      throw new Error("test debería fallar antes");
    } catch (error) {
      expect(error).toBeInstanceOf(ChatRequestValidationError);
    }
  });

  it("rechaza runtime model id externo cuando no es id interno del catálogo", () => {
    expect(() =>
      parseChatRequest({
        ...baseRequest,
        modelId: "amazon-bedrock/anthropic.claude-haiku-4-5-20251001-v1:0",
      }),
    ).toThrowError(
      expect.objectContaining({
        code: ATTACHMENT_ERROR_CODES.invalidModel,
        statusCode: 400,
      }),
    );
  });

  it("resolves the current Bedrock runtime model id", () => {
    const payload = parseChatRequest({
      ...baseRequest,
      modelId: "claude-sonnet-4-6",
    });

    expect(payload.runtimeModelId).toBe("amazon-bedrock/us.anthropic.claude-sonnet-4-6");
  });

  it("acepta adjuntos ya persistidos por referencia (sin data URL)", () => {
    const payload = parseChatRequest({
      ...baseRequest,
      modelId: "claude-sonnet-4-6",
      messages: [
        {
          id: "m-1",
          role: "user",
          parts: [
            { type: "text", text: "continúa" },
            {
              type: "file",
              mediaType: "image/png",
              filename: "persisted.png",
              url: "https://bucket.s3.us-east-1.amazonaws.com/secondstream/attachments/t/img.png",
              metadata: {
                version: 1,
                mediaType: "image/png",
                s3Key: "secondstream/attachments/t/img.png",
                sizeBytes: 123,
                url: "https://bucket.s3.us-east-1.amazonaws.com/secondstream/attachments/t/img.png",
              },
            },
          ],
        },
      ],
    });

    expect(payload.messages[0].parts[1]).toMatchObject({ type: "file", mediaType: "image/png" });
  });
});
