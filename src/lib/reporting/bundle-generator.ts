import { Buffer } from "node:buffer";
import {
  renderFullDiscoveryMarkdown,
  renderSnapshotInline,
} from "@/lib/reporting/markdown-renderer";
import {
  type ReportBundleManifest,
  ReportBundleManifestSchema,
  type ReportBundleRequest,
} from "@/lib/reporting/schemas";
import type { BlobStore } from "@/lib/storage/blob-store";

type RenderExecutivePdf = (request: ReportBundleRequest) => Promise<Buffer>;

const slugFilename = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");

export type GenerateReportBundleDeps = {
  blobStore: BlobStore;
  renderExecutivePdf: RenderExecutivePdf;
};

export type GeneratedReportBundle = {
  snapshotInline: string;
  manifest: ReportBundleManifest;
};

export const generateReportBundle = async (
  request: ReportBundleRequest,
  deps: GenerateReportBundleDeps,
): Promise<GeneratedReportBundle> => {
  console.info("[discovery-report-bundle] bundle:start", {
    bundleId: request.bundleId,
    threadId: request.threadId,
  });

  const snapshotInline = renderSnapshotInline(request);
  console.info("[discovery-report-bundle] bundle:snapshot-ready", {
    bundleId: request.bundleId,
  });

  const markdown = renderFullDiscoveryMarkdown(request);
  console.info("[discovery-report-bundle] bundle:markdown-ready", {
    bundleId: request.bundleId,
    sizeBytes: Buffer.byteLength(markdown, "utf8"),
  });

  console.info("[discovery-report-bundle] bundle:pdf-render-start", {
    bundleId: request.bundleId,
  });
  const executivePdf = await deps.renderExecutivePdf(request);
  console.info("[discovery-report-bundle] bundle:pdf-render-done", {
    bundleId: request.bundleId,
    sizeBytes: executivePdf.length,
  });

  const baseFilename = `${slugFilename(request.executiveReport.customerSlug)}-${slugFilename(
    request.executiveReport.streamSlug,
  )}_${request.executiveReport.reportDate}`;

  const pdfFilename = `${baseFilename}_discovery-exec.pdf`;
  const markdownFilename = `${baseFilename}_discovery-full.md`;

  console.info("[discovery-report-bundle] bundle:upload-start", {
    bundleId: request.bundleId,
    files: [pdfFilename, markdownFilename],
  });

  const [savedPdf, savedMarkdown] = await Promise.all([
    deps.blobStore.put({
      bytes: executivePdf,
      filename: pdfFilename,
      mediaType: "application/pdf",
      threadId: request.threadId,
    }),
    deps.blobStore.put({
      bytes: Buffer.from(markdown, "utf8"),
      filename: markdownFilename,
      mediaType: "text/markdown",
      threadId: request.threadId,
    }),
  ]);

  console.info("[discovery-report-bundle] bundle:upload-done", {
    bundleId: request.bundleId,
    files: [savedPdf.key, savedMarkdown.key],
  });

  const manifestCandidate = {
    bundleId: request.bundleId,
    files: [
      {
        artifactType: "executive-pdf",
        filename: pdfFilename,
        mediaType: "application/pdf",
        url: savedPdf.url,
      },
      {
        artifactType: "full-markdown",
        filename: markdownFilename,
        mediaType: "text/markdown",
        url: savedMarkdown.url,
      },
    ],
  };

  const manifestResult = ReportBundleManifestSchema.parse(manifestCandidate);

  return {
    snapshotInline,
    manifest: manifestResult,
  };
};
