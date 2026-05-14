import { describe, expect, it } from "vitest";
import { getAttachmentValidationMessage } from "@/components/chat-prompt-composer";

describe("getAttachmentValidationMessage", () => {
  it("returns an explicit size limit message", () => {
    expect(getAttachmentValidationMessage("max_file_size")).toContain("4MB");
  });

  it("returns an explicit invalid type message", () => {
    expect(getAttachmentValidationMessage("accept")).toContain("PNG");
    expect(getAttachmentValidationMessage("accept")).toContain("CSV");
  });

  it("returns an explicit max files message", () => {
    expect(getAttachmentValidationMessage("max_files")).toContain("files");
  });

  it("returns an explicit file read failure message", () => {
    expect(getAttachmentValidationMessage("read_failed")).toContain("Remove them and try again");
  });
});
