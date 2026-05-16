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

const createStackMock = vi.hoisted(() => vi.fn((stackName: string) => ({ stackName })));

const defineBackendMock = vi.hoisted(() =>
  vi.fn(() => ({
    auth: {
      resources: {
        cfnResources: {
          cfnUserPool,
        },
        userPool: { userPoolId: "UserPoolId" },
        userPoolClient: { userPoolClientId: "UserPoolClientId" },
      },
    },
    createStack: createStackMock,
    data: {
      resources: {
        tables: {
          Session: { tableArn: "arn:session", tableName: "SessionTable" },
          Message: { tableArn: "arn:message", tableName: "MessageTable" },
          Artifact: { tableArn: "arn:artifact", tableName: "ArtifactTable" },
        },
      },
    },
    storage: {
      resources: {
        bucket: { bucketArn: "arn:bucket", bucketName: "BucketName" },
      },
    },
  })),
);

const addFunctionUrlMock = vi.hoisted(() =>
  vi.fn(() => ({ url: "https://canary.lambda-url.test/" })),
);
const addToRolePolicyMock = vi.hoisted(() => vi.fn());
const nodejsFunctionMock = vi.hoisted(() =>
  vi.fn(() => ({
    addFunctionUrl: addFunctionUrlMock,
    addToRolePolicy: addToRolePolicyMock,
  })),
);
const cfnOutputMock = vi.hoisted(() => vi.fn());
const policyStatementMock = vi.hoisted(() => vi.fn((input) => ({ policy: input })));

vi.mock("@aws-amplify/backend", () => ({
  defineBackend: defineBackendMock,
}));

vi.mock("aws-cdk-lib", () => ({
  Aws: { ACCOUNT_ID: "123456789012" },
  CfnOutput: cfnOutputMock,
  Duration: {
    seconds: vi.fn((seconds: number) => ({ seconds })),
    minutes: vi.fn((minutes: number) => ({ minutes })),
  },
}));

vi.mock("aws-cdk-lib/aws-iam", () => ({
  PolicyStatement: policyStatementMock,
}));

vi.mock("aws-cdk-lib/aws-lambda", () => ({
  FunctionUrlAuthType: { NONE: "NONE" },
  HttpMethod: { POST: "POST" },
  InvokeMode: { RESPONSE_STREAM: "RESPONSE_STREAM" },
  Runtime: { NODEJS_22_X: "NODEJS_22_X" },
}));

vi.mock("aws-cdk-lib/aws-lambda-nodejs", () => ({
  NodejsFunction: nodejsFunctionMock,
  OutputFormat: { ESM: "esm" },
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
    addToRolePolicyMock.mockClear();
    policyStatementMock.mockClear();
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
    expect(createStackMock).toHaveBeenCalledWith("chat-streaming");
    expect(nodejsFunctionMock).toHaveBeenCalledWith(
      { stackName: "streaming-canary" },
      "StreamingCanary",
      expect.objectContaining({
        runtime: "NODEJS_22_X",
        timeout: { seconds: 15 },
      }),
    );
    expect(nodejsFunctionMock).toHaveBeenCalledWith(
      { stackName: "chat-streaming" },
      "ChatStreamingFunction",
      expect.objectContaining({
        bundling: expect.objectContaining({
          banner:
            "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
          commandHooks: expect.objectContaining({
            afterBundling: expect.any(Function),
            beforeBundling: expect.any(Function),
            beforeInstall: expect.any(Function),
          }),
          format: "esm",
        }),
        environment: expect.objectContaining({
          COGNITO_USER_POOL_ID: "UserPoolId",
          COGNITO_USER_POOL_CLIENT_ID: "UserPoolClientId",
          LAMBDA_CHAT_SESSION_TABLE_NAME: "SessionTable",
          LAMBDA_CHAT_MESSAGE_TABLE_NAME: "MessageTable",
          LAMBDA_CHAT_ARTIFACT_TABLE_NAME: "ArtifactTable",
          LAMBDA_CHAT_BLOB_BUCKET_NAME: "BucketName",
        }),
        memorySize: 1024,
        runtime: "NODEJS_22_X",
        timeout: { minutes: 5 },
      }),
    );
    type ChatFunctionConfig = {
      bundling?: {
        commandHooks?: {
          beforeBundling?: (inputDir: string, outputDir: string) => string[];
        };
      };
    };
    const chatFunctionCall = (nodejsFunctionMock.mock.calls as unknown[][]).find(
      ([, id]) => id === "ChatStreamingFunction",
    );
    const chatFunctionConfig = chatFunctionCall?.[2] as ChatFunctionConfig;
    const copyCommands = chatFunctionConfig.bundling?.commandHooks?.beforeBundling?.(
      "/asset-input",
      "/asset-output",
    );
    expect(copyCommands).toEqual([
      "mkdir -p /asset-output/src/ai && cp -R /asset-input/src/ai/skills /asset-output/src/ai/skills",
    ]);

    expect(addFunctionUrlMock).toHaveBeenCalledTimes(2);
    const canaryFunctionUrlConfig = addFunctionUrlMock.mock.calls.at(0)?.at(0) as unknown;
    const chatFunctionUrlConfig = addFunctionUrlMock.mock.calls.at(1)?.at(0) as unknown;
    expect(canaryFunctionUrlConfig).toEqual({
      authType: "NONE",
      invokeMode: "RESPONSE_STREAM",
    });
    expect(chatFunctionUrlConfig).toEqual({
      authType: "NONE",
      cors: {
        allowedHeaders: [
          "accept",
          "accept-language",
          "authorization",
          "content-type",
          "user-agent",
          "x-request-id",
        ],
        allowedMethods: ["POST"],
        allowedOrigins: ["https://main.d22icjbzj7x471.amplifyapp.com", "http://localhost:3000"],
        exposedHeaders: ["x-error-code", "x-request-id"],
        maxAge: { seconds: 600 },
      },
      invokeMode: "RESPONSE_STREAM",
    });
    expect(cfnOutputMock).toHaveBeenCalledWith(
      { stackName: "streaming-canary" },
      "StreamingCanaryFunctionUrl",
      { value: "https://canary.lambda-url.test/" },
    );
    expect(cfnOutputMock).toHaveBeenCalledWith(
      { stackName: "chat-streaming" },
      "ChatStreamingFunctionUrl",
      { value: "https://canary.lambda-url.test/" },
    );
    expect(policyStatementMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining(["dynamodb:GetItem", "dynamodb:Query"]),
        resources: expect.arrayContaining(["arn:session", "arn:message", "arn:artifact"]),
      }),
    );
    expect(policyStatementMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining(["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]),
        resources: expect.arrayContaining(["arn:bucket/lambda-chat/attachments/*"]),
      }),
    );
    expect(policyStatementMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining(["bedrock:InvokeModelWithResponseStream"]),
      }),
    );
    expect(addToRolePolicyMock).toHaveBeenCalledTimes(3);
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
