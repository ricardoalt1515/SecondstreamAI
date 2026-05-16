import { describe, expect, it } from "vitest";
import type { FieldBriefPayload } from "../payloads";
import { renderFieldBriefPdf } from "./field-brief-document";

const payload: FieldBriefPayload = {
  customer: { location: "Prairie, TX", name: "Prairie Water", slug: "prairie-water" },
  stage: "Qualify",
  confidence: "MEDIUM",
  date: "2026-05-15",
  stopFlags: [{ title: "Budget timing", summary: "Capital approval may slip." }],
  sections: {
    whatThisIs: {
      insight: "Lagoon pressure is the deal driver.",
      body: "Evidence points to capacity strain and NPDES schedule pressure.",
    },
    whatWeWouldPropose: {
      insight: "Lead with modular capacity and avoided surcharge exposure.",
      recommendedApproach: "Modular treatment-stage expansion with a narrow first-phase scope.",
      winWinArguments: [
        { lead: "Avoid delay", body: "Keeps the customer ahead of permit pressure." },
        { lead: "Control spend", body: "Makes the capital request easier to stage." },
      ],
      costOfAlternativeRows: [
        { component: "Delay", theirPath: "$1M+ exposure", ourProposal: "Controlled capex" },
        { component: "Total", theirPath: "Unbounded", ourProposal: "Phased", isTotal: true },
      ],
      dealSizeSensitivity: "Validate budget range before promising final design.",
    },
    whatCouldKillIt: {
      insight: "Budget timing can stall the deal.",
      risks: [
        {
          name: "Budget freeze",
          mechanism: "Capital window slips.",
          mitigation: "Anchor phased scope.",
        },
      ],
    },
    doThisNext: {
      insight: "Close the data gap this week.",
      actions: [
        { title: "Ask for NPDES schedule", timeframe: "7 days", body: "Confirm deadlines." },
        {
          title: "Map decision roles",
          timeframe: "14 days",
          body: "Identify utility and finance owners.",
        },
        { title: "Draft scope", timeframe: "21 days", body: "Prepare modular option." },
      ],
    },
  },
};

describe("renderFieldBriefPdf", () => {
  it("renders a non-empty PDF from the typed Field Brief payload", async () => {
    const pdf = await renderFieldBriefPdf(payload);

    expect(pdf.byteLength).toBeGreaterThan(1000);
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  });
});
