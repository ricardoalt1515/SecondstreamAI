import { describe, expect, it, vi } from "vitest";
import { ReportBundleManifestSchema, type ReportBundleRequest } from "@/lib/reporting/schemas";

vi.mock("ai", () => ({
  tool: (definition: unknown) => definition,
}));

import {
  type GenerateDiscoveryReportBundleDeps,
  runGenerateDiscoveryReportBundle,
} from "@/lib/agents/tools/generate-discovery-report-bundle";

const validInput: ReportBundleRequest = {
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
  gotchas: ["No final RCRA classification in Discovery."],
};

describe("runGenerateDiscoveryReportBundle", () => {
  it("rechaza precondiciones faltantes con error mapeado", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const deps: GenerateDiscoveryReportBundleDeps = {
      generateBundle: vi.fn(),
    };

    await expect(
      runGenerateDiscoveryReportBundle(
        {
          ...validInput,
          prerequisites: {
            ...validInput.prerequisites,
            hasDiscoveryGapAnalysis: false,
          },
        },
        deps,
      ),
    ).rejects.toMatchObject({
      code: "BUNDLE_PRECONDITIONS_MISSING",
    });

    expect(deps.generateBundle).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      "[discovery-report-bundle] tool:preconditions-missing",
      expect.objectContaining({ bundleId: "bundle-001" }),
    );

    warnSpy.mockRestore();
  });

  it("devuelve manifest válido con snapshot y present_files PDF primero", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    const deps: GenerateDiscoveryReportBundleDeps = {
      generateBundle: vi.fn().mockResolvedValue({
        snapshotInline: "Snapshot inline content",
        manifest: {
          bundleId: "bundle-001",
          files: [
            {
              artifactType: "executive-pdf",
              filename: "acme-spent-caustic_2026-04-20_discovery-exec.pdf",
              mediaType: "application/pdf",
              url: "https://example.s3.us-east-1.amazonaws.com/path/exec.pdf",
            },
            {
              artifactType: "full-markdown",
              filename: "acme-spent-caustic_2026-04-20_discovery-full.md",
              mediaType: "text/markdown",
              url: "https://example.s3.us-east-1.amazonaws.com/path/full.md",
            },
          ],
        },
      }),
    };

    const result = await runGenerateDiscoveryReportBundle(validInput, deps);
    const manifestParse = ReportBundleManifestSchema.safeParse(result.manifest);

    expect(manifestParse.success).toBe(true);
    expect(result.presentFiles).toEqual([
      {
        filename: "acme-spent-caustic_2026-04-20_discovery-exec.pdf",
        mediaType: "application/pdf",
        url: "https://example.s3.us-east-1.amazonaws.com/path/exec.pdf",
      },
      {
        filename: "acme-spent-caustic_2026-04-20_discovery-full.md",
        mediaType: "text/markdown",
        url: "https://example.s3.us-east-1.amazonaws.com/path/full.md",
      },
    ]);
    expect(infoSpy).toHaveBeenCalledWith(
      "[discovery-report-bundle] tool:success",
      expect.objectContaining({ bundleId: "bundle-001" }),
    );

    infoSpy.mockRestore();
  });

  it("mapea errores inesperados de generación", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const deps: GenerateDiscoveryReportBundleDeps = {
      generateBundle: vi.fn().mockRejectedValue(new Error("s3 timeout")),
    };

    await expect(runGenerateDiscoveryReportBundle(validInput, deps)).rejects.toMatchObject({
      code: "BUNDLE_GENERATION_FAILED",
    });
    expect(errorSpy).toHaveBeenCalledWith(
      "[discovery-report-bundle] tool:error",
      expect.objectContaining({ bundleId: "bundle-001", code: "BUNDLE_GENERATION_FAILED" }),
    );

    errorSpy.mockRestore();
  });
});
