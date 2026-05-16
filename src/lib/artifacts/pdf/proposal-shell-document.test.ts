import { describe, expect, it } from "vitest";
import type { ProposalShellPayload } from "../payloads";
import { renderProposalShellPdf } from "./proposal-shell-document";

const payload: ProposalShellPayload = {
  customer: { location: "Prairie, TX", name: "Prairie Water", slug: "prairie-water" },
  title: "Prairie Water Proposal Shell",
  executiveSummary: "Phased modular capacity buys the customer time and caps capex.",
  proposedScope: ["Modular treatment-stage expansion", "NPDES-aligned monitoring upgrades"],
  sizingAndPricing: "Range $4.2M-$5.8M MEDIUM confidence pending hydraulic confirmation.",
  schedule: "Mobilise Q3 2026; commissioning Q1 2027.",
  commitments: {
    commitTo: ["Modular phase-1 scope", "Hydraulic validation deliverable"],
    doNotCommitYet: ["Phase-2 sizing", "Final NPDES determination"],
  },
  fundingPathway: "CWSRF financing track with bridging contingency.",
  riskAllocation: "Customer retains permit risk; we hold capacity-delivery risk.",
};

describe("renderProposalShellPdf", () => {
  it("renders a non-empty PDF from the typed Proposal Shell payload", async () => {
    const pdf = await renderProposalShellPdf(payload);

    expect(pdf.byteLength).toBeGreaterThan(1000);
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  });
});
