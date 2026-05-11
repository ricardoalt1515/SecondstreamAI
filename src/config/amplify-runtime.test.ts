import { describe, expect, it } from "vitest";
import { assertAmplifyOutputsConfigured, getMissingAmplifyOutputSections } from "./amplify-runtime";

describe("amplify runtime configuration", () => {
  it("reports missing Auth/Data/Storage sections for placeholder outputs", () => {
    expect(getMissingAmplifyOutputSections({ version: "1.4" })).toEqual([
      "auth",
      "data",
      "storage",
    ]);
  });

  it("fails fast with the official sandbox command when outputs are placeholders", () => {
    expect(() => assertAmplifyOutputsConfigured({ version: "1.4" })).toThrow(/npx ampx sandbox/);
    expect(() => assertAmplifyOutputsConfigured({ version: "1.4" })).toThrow(/Node LTS/);
  });

  it("accepts outputs that include Auth, Data, and Storage", () => {
    expect(() =>
      assertAmplifyOutputsConfigured({
        version: "1.4",
        auth: {},
        data: {},
        storage: {},
      }),
    ).not.toThrow();
  });
});
