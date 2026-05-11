import { describe, expect, it, vi } from "vitest";

const defineStorageMock = vi.hoisted(() => vi.fn((config) => config));

vi.mock("@aws-amplify/backend", () => ({
  defineStorage: defineStorageMock,
}));

describe("Amplify storage resource", () => {
  it("keeps private storage scoped to the identity root with a Gen 2-valid access path", async () => {
    vi.resetModules();
    defineStorageMock.mockClear();

    const { AMPLIFY_PRIVATE_STORAGE_ACCESS_PATH } = await import("./resource");

    expect(AMPLIFY_PRIVATE_STORAGE_ACCESS_PATH).toBe("private/{entity_id}/*");
    expect(AMPLIFY_PRIVATE_STORAGE_ACCESS_PATH).not.toBe("private/{entity_id}/sessions/*");

    const access = defineStorageMock.mock.calls[0]?.[0].access;
    const identityRule = Symbol("identity storage rule");
    const to = vi.fn(() => identityRule);
    const entity = vi.fn(() => ({ to }));

    expect(access({ entity })).toEqual({
      "private/{entity_id}/*": [identityRule],
    });
    expect(entity).toHaveBeenCalledWith("identity");
    expect(to).toHaveBeenCalledWith(["read", "write", "delete"]);
  });
});
