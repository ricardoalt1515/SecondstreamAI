import { describe, expect, it } from "vitest";
import { buildAmplifyPrivatePath } from "./amplify-blob-store";

describe("AmplifyBlobStore", () => {
  it("builds private owner/session paths and sanitizes user-controlled segments", () => {
    const path = buildAmplifyPrivatePath("us-east-1:identity", {
      bytes: Buffer.from("transcript"),
      filename: "rough transcript (draft).pdf",
      mediaType: "application/pdf",
      threadId: "thread/../unsafe",
    });

    expect(path).toMatch(
      /^private\/us-east-1:identity\/sessions\/thread-..-unsafe\/[\w-]+-rough-transcript--draft-.pdf$/,
    );
  });
});
