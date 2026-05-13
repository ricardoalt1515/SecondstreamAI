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

const createStackMock = vi.hoisted(() => vi.fn(() => ({ stackName: "streaming-canary" })));

const defineBackendMock = vi.hoisted(() =>
  vi.fn(() => ({
    auth: {
      resources: {
        cfnResources: {
          cfnUserPool,
        },
      },
    },
    createStack: createStackMock,
  })),
);

const addFunctionUrlMock = vi.hoisted(() =>
  vi.fn(() => ({ url: "https://canary.lambda-url.test/" })),
);
const nodejsFunctionMock = vi.hoisted(() =>
  vi.fn(() => ({
    addFunctionUrl: addFunctionUrlMock,
  })),
);
const cfnOutputMock = vi.hoisted(() => vi.fn());

vi.mock("@aws-amplify/backend", () => ({
  defineBackend: defineBackendMock,
}));

vi.mock("aws-cdk-lib", () => ({
  CfnOutput: cfnOutputMock,
  Duration: {
    seconds: vi.fn((seconds: number) => ({ seconds })),
  },
}));

vi.mock("aws-cdk-lib/aws-lambda", () => ({
  FunctionUrlAuthType: { NONE: "NONE" },
  InvokeMode: { RESPONSE_STREAM: "RESPONSE_STREAM" },
  Runtime: { NODEJS_22_X: "NODEJS_22_X" },
}));

vi.mock("aws-cdk-lib/aws-lambda-nodejs", () => ({
  NodejsFunction: nodejsFunctionMock,
}));

vi.mock("./auth/resource", () => ({ auth: { resource: "auth" } }));
vi.mock("./data/resource", () => ({ data: { resource: "data" } }));
vi.mock("./storage/resource", () => ({ storage: { resource: "storage" } }));

describe("Amplify backend", () => {
  it("configures the Cognito user pool for admin-created users only", async () => {
    vi.resetModules();
    defineBackendMock.mockClear();
    createStackMock.mockClear();
    nodejsFunctionMock.mockClear();
    addFunctionUrlMock.mockClear();
    cfnOutputMock.mockClear();
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
    expect(createStackMock).toHaveBeenCalledWith("streaming-canary");
    expect(nodejsFunctionMock).toHaveBeenCalledWith(
      { stackName: "streaming-canary" },
      "StreamingCanary",
      expect.objectContaining({
        runtime: "NODEJS_22_X",
        timeout: { seconds: 15 },
      }),
    );
    expect(addFunctionUrlMock).toHaveBeenCalledWith({
      authType: "NONE",
      invokeMode: "RESPONSE_STREAM",
    });
    expect(cfnOutputMock).toHaveBeenCalledWith(
      { stackName: "streaming-canary" },
      "StreamingCanaryFunctionUrl",
      { value: "https://canary.lambda-url.test/" },
    );
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
