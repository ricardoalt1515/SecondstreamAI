import type { Buffer } from "node:buffer";

type PageLike = {
  setContent: (
    html: string,
    options?: { waitUntil?: "load" | "domcontentloaded"; timeout?: number },
  ) => Promise<void>;
  pdf: (options?: {
    format?: "Letter";
    printBackground?: boolean;
    margin?: { top: string; right: string; bottom: string; left: string };
  }) => Promise<Buffer>;
  close: () => Promise<void>;
};

type ContextLike = {
  newPage: () => Promise<PageLike>;
  close: () => Promise<void>;
};

type BrowserLike = {
  newContext: () => Promise<ContextLike>;
  close: () => Promise<void>;
};

export type PlaywrightLike = {
  launch: (options?: { headless?: boolean }) => Promise<BrowserLike>;
};

const ensureNoUnicodeSubSup = (html: string): void => {
  if (/[₀₁₂₃₄₅₆₇₈₉⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(html)) {
    throw new Error(
      "Executive report HTML contains Unicode sub/superscripts; use HTML markup instead.",
    );
  }
};

const defaultMargins = {
  top: "1in",
  right: "1in",
  bottom: "1in",
  left: "1in",
} as const;

const loadPlaywright = async (): Promise<PlaywrightLike> => {
  try {
    const dynamicImport = new Function("moduleName", "return import(moduleName)") as (
      moduleName: string,
    ) => Promise<unknown>;
    const mod = (await dynamicImport("playwright")) as { chromium?: PlaywrightLike };
    const chromium = (mod as { chromium?: PlaywrightLike }).chromium;
    if (!chromium) {
      throw new Error("playwright chromium export not available");
    }

    return chromium;
  } catch (error) {
    throw new Error(`Playwright runtime unavailable: ${(error as Error).message}`);
  }
};

export const renderPdfFromHtml = async (
  html: string,
  options?: {
    playwright?: PlaywrightLike;
    timeoutMs?: number;
  },
): Promise<Buffer> => {
  ensureNoUnicodeSubSup(html);

  const playwright = options?.playwright ?? (await loadPlaywright());
  const timeoutMs = options?.timeoutMs ?? 15_000;

  let browser: BrowserLike | null = null;
  let context: ContextLike | null = null;
  let page: PageLike | null = null;

  try {
    browser = await playwright.launch({ headless: true });
    context = await browser.newContext();
    page = await context.newPage();

    await page.setContent(html, {
      waitUntil: "load",
      timeout: timeoutMs,
    });

    return await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: defaultMargins,
    });
  } catch (error) {
    throw new Error(`Playwright PDF render failed: ${(error as Error).message}`);
  } finally {
    await Promise.allSettled([page?.close(), context?.close(), browser?.close()]);
  }
};
