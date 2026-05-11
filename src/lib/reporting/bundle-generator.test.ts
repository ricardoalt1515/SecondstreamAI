import { Buffer } from "node:buffer";
import { describe, expect, it, vi } from "vitest";
import { generateReportBundle } from "@/lib/reporting/bundle-generator";
import type { ReportBundleRequest } from "@/lib/reporting/schemas";
import type { BlobStore } from "@/lib/storage/blob-store";

const request: ReportBundleRequest = {
  bundleId: "bundle-001",
  threadId: "thread-001",
  generatedAt: "2026-04-20T17:00:00.000Z",
  prerequisites: {
    hasCommercialShaping: true,
    hasDiscoveryGapAnalysis: true,
    hasSafetyFlagging: true,
    hasQualificationGate: true,
  },
  qualificationGate: {
    status: "open",
  },
  safetyFlags: [],
  snapshot: {
    headline: "Opportunity needs segmented routing",
    summary: "The stream differs by site and must not be quoted as one lot.",
    nextAction: "Run producer call to confirm per-site volumes.",
  },
  executiveReport: {
    customerSlug: "acme",
    streamSlug: "spent-caustic",
    reportDate: "2026-04-20",
    sections: [
      {
        id: "what-this-really-is",
        title: "What this really is",
        lead: "This is a segregated portfolio opportunity.",
        body: "Per-site chemistry divergence changes treatment and commercial fit.",
        evidenceTags: ["EV-001"],
      },
    ],
  },
  evidenceTags: ["EV-001"],
  gotchas: ["Use only evidence-backed assumptions before Assessment."],
};

describe("generateReportBundle", () => {
  it("sube PDF y Markdown a S3 y devuelve manifest en orden PDF primero", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    const put = vi
      .fn<BlobStore["put"]>()
      .mockResolvedValueOnce({
        key: "secondstream/reports/thread-001/exec.pdf",
        url: "https://bucket.s3.us-east-1.amazonaws.com/secondstream/reports/thread-001/exec.pdf",
        sizeBytes: 1200,
      })
      .mockResolvedValueOnce({
        key: "secondstream/reports/thread-001/full.md",
        url: "https://bucket.s3.us-east-1.amazonaws.com/secondstream/reports/thread-001/full.md",
        sizeBytes: 900,
      });

    const blobStore = {
      put,
      get: vi.fn(),
      delete: vi.fn(),
    } satisfies BlobStore;

    const result = await generateReportBundle(request, {
      blobStore,
      renderExecutivePdf: vi.fn().mockResolvedValue(Buffer.from("pdf")),
    });

    expect(put).toHaveBeenCalledTimes(2);
    expect(result.manifest.files[0].artifactType).toBe("executive-pdf");
    expect(result.manifest.files[1].artifactType).toBe("full-markdown");
    expect(result.manifest.files[0].mediaType).toBe("application/pdf");
    expect(result.manifest.files[1].mediaType).toBe("text/markdown");
    expect(result.snapshotInline).toContain("Qualification gate: OPEN");
    expect(infoSpy).toHaveBeenCalledWith(
      "[discovery-report-bundle] bundle:pdf-render-start",
      expect.objectContaining({ bundleId: "bundle-001" }),
    );
    expect(infoSpy).toHaveBeenCalledWith(
      "[discovery-report-bundle] bundle:upload-done",
      expect.objectContaining({ bundleId: "bundle-001" }),
    );

    infoSpy.mockRestore();
  });
});
