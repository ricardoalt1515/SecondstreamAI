import { describe, expect, it } from "vitest";

import { createAmplifyClientLibraryOptions } from "./amplify-client";

describe("createAmplifyClientLibraryOptions", () => {
  it("keeps Auth token and credentials providers configured for SSR", () => {
    const options = createAmplifyClientLibraryOptions();

    expect(options.ssr).toBe(true);
    expect(options.Auth?.tokenProvider).toBeDefined();
    expect(options.Auth?.credentialsProvider).toBeDefined();
  });
});
