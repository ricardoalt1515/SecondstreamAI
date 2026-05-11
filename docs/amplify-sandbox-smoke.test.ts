import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const smokeDocPath = fileURLToPath(new URL("./amplify-sandbox-smoke.md", import.meta.url));

describe("Amplify sandbox smoke checklist", () => {
  it("documents the admin-created invited user first sign-in flow", () => {
    const checklist = readFileSync(smokeDocPath, "utf8");

    expect(checklist).toContain("admin-created user");
    expect(checklist).toContain("temporary password");
    expect(checklist).toContain("first sign-in");
  });

  it("documents verification that public self-registration is blocked", () => {
    const checklist = readFileSync(smokeDocPath, "utf8");

    expect(checklist).toContain("public self-registration");
    expect(checklist).toContain("direct Cognito SignUp");
    expect(checklist).toContain("rejected");
  });
});
