import { Buffer } from "node:buffer";
import { describe, expect, it, vi } from "vitest";
import { type PlaywrightLike, renderPdfFromHtml } from "@/lib/reporting/playwright-renderer";

describe("renderPdfFromHtml", () => {
  it("ejecuta lifecycle launch → newContext → newPage → setContent → pdf → close", async () => {
    const pdfBuffer = Buffer.from("pdf-binary");
    const setContent = vi.fn().mockResolvedValue(undefined);
    const pdf = vi.fn().mockResolvedValue(pdfBuffer);
    const pageClose = vi.fn().mockResolvedValue(undefined);
    const contextClose = vi.fn().mockResolvedValue(undefined);
    const browserClose = vi.fn().mockResolvedValue(undefined);

    const playwright: PlaywrightLike = {
      launch: vi.fn().mockResolvedValue({
        newContext: vi.fn().mockResolvedValue({
          newPage: vi.fn().mockResolvedValue({
            setContent,
            pdf,
            close: pageClose,
          }),
          close: contextClose,
        }),
        close: browserClose,
      }),
    };

    const result = await renderPdfFromHtml("<html><body><h1>test</h1></body></html>", {
      playwright,
      timeoutMs: 3000,
    });

    expect(result.equals(pdfBuffer)).toBe(true);
    expect(playwright.launch).toHaveBeenCalledOnce();
    expect(setContent).toHaveBeenCalledOnce();
    expect(pdf).toHaveBeenCalledOnce();
    expect(pageClose).toHaveBeenCalledOnce();
    expect(contextClose).toHaveBeenCalledOnce();
    expect(browserClose).toHaveBeenCalledOnce();
  });

  it("mapea timeout y cierra recursos", async () => {
    const pageClose = vi.fn().mockResolvedValue(undefined);
    const contextClose = vi.fn().mockResolvedValue(undefined);
    const browserClose = vi.fn().mockResolvedValue(undefined);

    const playwright: PlaywrightLike = {
      launch: vi.fn().mockResolvedValue({
        newContext: vi.fn().mockResolvedValue({
          newPage: vi.fn().mockResolvedValue({
            setContent: vi.fn().mockRejectedValue(new Error("Timeout 3000ms exceeded")),
            pdf: vi.fn(),
            close: pageClose,
          }),
          close: contextClose,
        }),
        close: browserClose,
      }),
    };

    await expect(
      renderPdfFromHtml("<html><body><h1>test</h1></body></html>", {
        playwright,
        timeoutMs: 3000,
      }),
    ).rejects.toThrow("Playwright PDF render failed");

    expect(pageClose).toHaveBeenCalledOnce();
    expect(contextClose).toHaveBeenCalledOnce();
    expect(browserClose).toHaveBeenCalledOnce();
  });
});
