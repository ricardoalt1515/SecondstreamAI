import { describe, expect, it } from "vitest";
import { buildArtifactTriggerReminder } from "./artifact-trigger";

describe("artifact trigger policy", () => {
  it("requests Field Brief generation when a user message has an attachment", () => {
    const reminder = buildArtifactTriggerReminder({
      messages: [
        {
          role: "user",
          parts: [
            { type: "text", text: "Review this case file." },
            { type: "file", mediaType: "application/pdf", url: "data:application/pdf;base64,AA==" },
          ],
        },
      ],
    });

    expect(reminder).toContain("hasAttachment: true");
    expect(reminder).toContain("generateFieldBrief");
    expect(reminder).toContain("generatePlaybook");
    expect(reminder).toContain("generateAnalyticalRead");
    expect(reminder).toContain("generateProposalShell");
    expect(reminder).toContain("in parallel");
  });

  it("requests artifact package generation when a trigger phrase is present", () => {
    const reminder = buildArtifactTriggerReminder({
      messages: [{ role: "user", parts: [{ type: "text", text: "What should I do here?" }] }],
    });

    expect(reminder).toContain("triggerPhraseMatched: true");
    expect(reminder).toContain("generateFieldBrief");
    expect(reminder).toContain("in parallel");
  });

  it("does not request artifact generation for non-triggering messages", () => {
    const reminder = buildArtifactTriggerReminder({
      messages: [{ role: "user", parts: [{ type: "text", text: "Explain this regulation." }] }],
    });

    expect(reminder).toContain("hasAttachment: false");
    expect(reminder).toContain("triggerPhraseMatched: false");
    expect(reminder).toContain("Do not call artifact generation tools");
  });
});
