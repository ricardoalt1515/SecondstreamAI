import { describe, expect, it } from "vitest";
import type { AnalyticalReadPayload } from "../payloads";
import { renderAnalyticalReadPdf } from "./analytical-read-document";

const payload: AnalyticalReadPayload = {
  customer: { location: "Prairie, TX", name: "Prairie Water", slug: "prairie-water" },
  title: "Prairie Water Analytical Read",
  summary: "Capacity strain plus NPDES horizon define the deal.",
  sections: [
    {
      heading: "Evidence base",
      body: "Flow data and permit history support the wet-weather lens.",
      evidenceTags: ["FLOW-DATA", "NPDES-RENEWAL"],
      table: [
        { Metric: "ADF (MGD)", Value: "3.4", Source: "Utility 2024 report" },
        { Metric: "Permit renewal", Value: "2027-Q2", Source: "TCEQ schedule" },
      ],
    },
    {
      heading: "Decision-maker matrix",
      body: "Utility director leads; finance committee approves capex.",
    },
  ],
};

describe("renderAnalyticalReadPdf", () => {
  it("renders a non-empty PDF from the typed Analytical Read payload", async () => {
    const pdf = await renderAnalyticalReadPdf(payload);

    expect(pdf.byteLength).toBeGreaterThan(1000);
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  });
});
