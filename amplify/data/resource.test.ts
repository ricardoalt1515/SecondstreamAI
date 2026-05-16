import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Amplify data schema", () => {
  it("declares a JSON-only Artifact model for H2O downloads", async () => {
    const source = await readFile(new URL("./resource.ts", import.meta.url), "utf-8");

    expect(source).toContain("Artifact: a");
    expect(source).toContain("userId: a.id().required()");
    expect(source).toContain("threadId: a.id().required()");
    expect(source).toContain("kind: a.string().required()");
    expect(source).not.toContain('kind: a.enum(["field-brief"');
    expect(source).toContain("payloadVersion: a.integer().required()");
    expect(source).toContain("payload: a.json().required()");
    expect(source).not.toContain("markdownStoragePath");
    expect(source).not.toContain("pdfStoragePath");
  });
});
