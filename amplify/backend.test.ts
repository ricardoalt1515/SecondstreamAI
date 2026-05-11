import { describe, expect, it, vi } from "vitest";

const cfnUserPool = vi.hoisted(() => ({
  adminCreateUserConfig: undefined as
    | {
        allowAdminCreateUserOnly?: boolean;
        inviteMessageTemplate?: { emailMessage: string; emailSubject: string };
        unusedAccountValidityDays?: number;
      }
    | undefined,
}));

const defineBackendMock = vi.hoisted(() =>
  vi.fn(() => ({
    auth: {
      resources: {
        cfnResources: {
          cfnUserPool,
        },
      },
    },
  })),
);

vi.mock("@aws-amplify/backend", () => ({
  defineBackend: defineBackendMock,
}));

vi.mock("./auth/resource", () => ({ auth: { resource: "auth" } }));
vi.mock("./data/resource", () => ({ data: { resource: "data" } }));
vi.mock("./storage/resource", () => ({ storage: { resource: "storage" } }));

describe("Amplify backend", () => {
  it("configures the Cognito user pool for admin-created users only", async () => {
    vi.resetModules();
    defineBackendMock.mockClear();
    cfnUserPool.adminCreateUserConfig = undefined;

    await import("./backend");

    expect(defineBackendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: expect.any(Object),
        data: expect.any(Object),
        storage: expect.any(Object),
      }),
    );
    expect(cfnUserPool.adminCreateUserConfig).toEqual({
      allowAdminCreateUserOnly: true,
    });
  });

  it("preserves existing Cognito invite config while enabling admin-created users only", async () => {
    vi.resetModules();
    defineBackendMock.mockClear();
    cfnUserPool.adminCreateUserConfig = {
      inviteMessageTemplate: {
        emailMessage: "Welcome {username}. Temporary password: {####}",
        emailSubject: "Second Stream invite",
      },
      unusedAccountValidityDays: 7,
    };

    await import("./backend");

    expect(cfnUserPool.adminCreateUserConfig).toEqual({
      allowAdminCreateUserOnly: true,
      inviteMessageTemplate: {
        emailMessage: "Welcome {username}. Temporary password: {####}",
        emailSubject: "Second Stream invite",
      },
      unusedAccountValidityDays: 7,
    });
  });
});
