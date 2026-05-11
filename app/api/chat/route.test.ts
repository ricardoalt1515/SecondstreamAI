import { describe, expect, it } from "vitest";

describe("chat route runtime config", () => {
  it("forces dynamic rendering for streaming responses", async () => {
    const route = await import("./route");

    expect(route.dynamic).toBe("force-dynamic");
  });
});
