import { describe, expect, it, vi } from "vitest";

const defineAuthMock = vi.hoisted(() => vi.fn((config) => config));

vi.mock("@aws-amplify/backend", () => ({
  defineAuth: defineAuthMock,
}));

describe("Amplify auth resource", () => {
  it("customizes admin-created user invitations while preserving Cognito placeholders", async () => {
    vi.resetModules();
    defineAuthMock.mockClear();

    await import("./resource");

    const config = defineAuthMock.mock.calls[0]?.[0];
    expect(config.loginWith.email.userInvitation.emailSubject).toBe(
      "Your SecondstreamAI invitation",
    );
    expect(
      config.loginWith.email.userInvitation.emailBody(
        () => "invited@example.com",
        () => "TempPass123!",
      ),
    ).toContain("invited@example.com");
    expect(
      config.loginWith.email.userInvitation.emailBody(
        () => "other@example.com",
        () => "DifferentPass456!",
      ),
    ).toContain("DifferentPass456!");
  });
});
