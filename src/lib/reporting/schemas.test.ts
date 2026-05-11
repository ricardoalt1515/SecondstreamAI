import { describe, expect, it } from "vitest";
import { ReportBundleManifestSchema, ReportBundleRequestSchema } from "@/lib/reporting/schemas";

describe("ReportBundleRequestSchema", () => {
  it("acepta un bundle mínimo válido", () => {
    const result = ReportBundleRequestSchema.safeParse({
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
    });

    expect(result.success).toBe(true);
  });

  it("acepta bundle aunque prerequisitos estén incompletos (gate se valida en la tool)", () => {
    const result = ReportBundleRequestSchema.safeParse({
      bundleId: "bundle-001",
      threadId: "thread-001",
      generatedAt: "2026-04-20T17:00:00.000Z",
      prerequisites: {
        hasCommercialShaping: true,
        hasDiscoveryGapAnalysis: false,
        hasSafetyFlagging: true,
        hasQualificationGate: true,
      },
      qualificationGate: {
        status: "open",
      },
      safetyFlags: [],
      snapshot: {
        headline: "x",
        summary: "y",
        nextAction: "z",
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
      gotchas: [],
    });

    expect(result.success).toBe(true);
  });
});

describe("ReportBundleManifestSchema", () => {
  it("exige orden de entrega PDF primero y markdown después", () => {
    const validManifest = ReportBundleManifestSchema.safeParse({
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
    });

    const invalidManifest = ReportBundleManifestSchema.safeParse({
      bundleId: "bundle-001",
      files: [
        {
          artifactType: "full-markdown",
          filename: "acme-spent-caustic_2026-04-20_discovery-full.md",
          mediaType: "text/markdown",
          url: "https://example.s3.us-east-1.amazonaws.com/path/full.md",
        },
        {
          artifactType: "executive-pdf",
          filename: "acme-spent-caustic_2026-04-20_discovery-exec.pdf",
          mediaType: "application/pdf",
          url: "https://example.s3.us-east-1.amazonaws.com/path/exec.pdf",
        },
      ],
    });

    expect(validManifest.success).toBe(true);
    expect(invalidManifest.success).toBe(false);
  });
});
