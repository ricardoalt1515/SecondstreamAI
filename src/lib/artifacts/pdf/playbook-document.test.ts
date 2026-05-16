import { describe, expect, it } from "vitest";
import type { PlaybookPayload } from "../payloads";
import { renderPlaybookPdf } from "./playbook-document";

const payload: PlaybookPayload = {
  customer: { location: "Prairie, TX", name: "Prairie Water", slug: "prairie-water" },
  stage: "Qualify",
  title: "Prairie Water Conversation Playbook",
  orientation: "Use these themes to advance from Qualify to Scope.",
  themes: [
    {
      title: "Service area, flow, and scale",
      framing: "Anchor the conversation on capacity strain.",
      substreamTag: "Wet weather",
      questions: ["What is current average daily flow?", "When did flow last exceed permit?"],
    },
    {
      title: "Permit and regulatory pressure",
      framing: "Probe the schedule the customer is racing.",
      questions: ["What is the NPDES renewal date?", "Are surcharges already accruing?"],
    },
  ],
};

describe("renderPlaybookPdf", () => {
  it("renders a non-empty PDF from the typed Playbook payload", async () => {
    const pdf = await renderPlaybookPdf(payload);

    expect(pdf.byteLength).toBeGreaterThan(1000);
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  });
});
