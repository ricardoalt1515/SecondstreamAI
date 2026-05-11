import { describe, expect, it } from "vitest";
import {
  renderFullDiscoveryMarkdown,
  renderSnapshotInline,
} from "@/lib/reporting/markdown-renderer";
import type { ReportBundleRequest } from "@/lib/reporting/schemas";

const baseRequest: ReportBundleRequest = {
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
    status: "closed",
    blocker: "Missing producer written confirmation.",
  },
  safetyFlags: [
    {
      severity: "stop",
      title: "H2S release risk",
      details: "Requires enclosure controls before moving forward.",
    },
  ],
  snapshot: {
    headline: "Segmented stream with safety blocker",
    summary: "Per-site chemistry means one-lot quoting is not viable.",
    nextAction: "Get producer confirmation and reopen gate.",
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

describe("renderSnapshotInline", () => {
  it("incluye snapshot con safety y gate visibles", () => {
    const snapshot = renderSnapshotInline(baseRequest);

    expect(snapshot).toContain("**Per-site chemistry means one-lot quoting is not viable.**");
    expect(snapshot).toContain("Safety: STOP — H2S release risk.");
    expect(snapshot).toContain(
      "Qualification gate: CLOSED — Missing producer written confirmation.",
    );
  });
});

describe("renderFullDiscoveryMarkdown", () => {
  it("genera markdown con secciones y anexos de evidence/gotchas", () => {
    const markdown = renderFullDiscoveryMarkdown(baseRequest);

    expect(markdown).toContain("# Full Discovery Report — acme");
    expect(markdown).toContain("## Qualification Gate");
    expect(markdown).toContain("## Safety Flags");
    expect(markdown).toContain("## 1. What this really is");
    expect(markdown).toContain("## Evidence Tags");
    expect(markdown).toContain("## Discovery Gotchas");
  });

  it("bloquea claims prohibidos en Discovery", () => {
    expect(() =>
      renderFullDiscoveryMarkdown({
        ...baseRequest,
        gotchas: ["Do not include final RCRA classification in this stage."],
      }),
    ).toThrow("Generated markdown contains forbidden Discovery claims.");
  });
});
