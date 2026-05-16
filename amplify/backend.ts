import { defineBackend } from "@aws-amplify/backend";
import { Aws, CfnOutput, Duration } from "aws-cdk-lib";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { FunctionUrlAuthType, HttpMethod, InvokeMode, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { storage } from "./storage/resource";

const backend = defineBackend({
  auth,
  data,
  storage,
});

const userPool = backend.auth.resources.cfnResources.cfnUserPool;

userPool.adminCreateUserConfig = {
  ...userPool.adminCreateUserConfig,
  allowAdminCreateUserOnly: true,
};

const streamingCanaryStack = backend.createStack("streaming-canary");

const streamingCanary = new NodejsFunction(streamingCanaryStack, "StreamingCanary", {
  entry: new URL("./functions/streaming-canary/handler.ts", import.meta.url).pathname,
  runtime: Runtime.NODEJS_22_X,
  timeout: Duration.seconds(15),
});

const streamingCanaryUrl = streamingCanary.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  invokeMode: InvokeMode.RESPONSE_STREAM,
});

new CfnOutput(streamingCanaryStack, "StreamingCanaryFunctionUrl", {
  value: streamingCanaryUrl.url,
});

const chatStreamingAllowedOrigins = [
  "https://main.d22icjbzj7x471.amplifyapp.com",
  "http://localhost:3000",
];
const chatStreamingStack = backend.createStack("chat-streaming");
const sessionTable = backend.data.resources.tables.Session;
const messageTable = backend.data.resources.tables.Message;
const artifactTable = backend.data.resources.tables.Artifact;
const blobBucket = backend.storage.resources.bucket;

const chatStreamingFunction = new NodejsFunction(chatStreamingStack, "ChatStreamingFunction", {
  entry: new URL("./functions/chat-streaming/handler.ts", import.meta.url).pathname,
  bundling: {
    banner:
      "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
    commandHooks: {
      afterBundling: () => [],
      beforeBundling: (inputDir: string, outputDir: string) => [
        `mkdir -p ${outputDir}/src/ai && cp -R ${inputDir}/src/ai/skills ${outputDir}/src/ai/skills`,
      ],
      beforeInstall: () => [],
    },
    format: OutputFormat.ESM,
  },
  environment: {
    CHAT_STREAM_ALLOWED_ORIGINS: chatStreamingAllowedOrigins.join(","),
    COGNITO_USER_POOL_CLIENT_ID: backend.auth.resources.userPoolClient.userPoolClientId,
    COGNITO_USER_POOL_ID: backend.auth.resources.userPool.userPoolId,
    LAMBDA_CHAT_ARTIFACT_TABLE_NAME: artifactTable.tableName,
    LAMBDA_CHAT_BLOB_BUCKET_NAME: blobBucket.bucketName,
    LAMBDA_CHAT_BLOB_PREFIX: "lambda-chat/attachments/",
    LAMBDA_CHAT_MESSAGE_SESSION_ID_INDEX_NAME: "messagesBySessionId",
    LAMBDA_CHAT_MESSAGE_TABLE_NAME: messageTable.tableName,
    LAMBDA_CHAT_SESSION_TABLE_NAME: sessionTable.tableName,
    LAMBDA_CHAT_SESSION_USER_ID_INDEX_NAME: "gsi-User.sessions",
  },
  memorySize: 1024,
  runtime: Runtime.NODEJS_22_X,
  timeout: Duration.minutes(5),
});

chatStreamingFunction.addToRolePolicy(
  new PolicyStatement({
    actions: [
      "dynamodb:BatchWriteItem",
      "dynamodb:DeleteItem",
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:Query",
      "dynamodb:UpdateItem",
    ],
    resources: [
      sessionTable.tableArn,
      `${sessionTable.tableArn}/index/*`,
      messageTable.tableArn,
      `${messageTable.tableArn}/index/*`,
      artifactTable.tableArn,
    ],
  }),
);

chatStreamingFunction.addToRolePolicy(
  new PolicyStatement({
    actions: ["s3:DeleteObject", "s3:GetObject", "s3:PutObject"],
    resources: [`${blobBucket.bucketArn}/lambda-chat/attachments/*`],
  }),
);

chatStreamingFunction.addToRolePolicy(
  new PolicyStatement({
    actions: [
      "bedrock:Converse",
      "bedrock:ConverseStream",
      "bedrock:InvokeModel",
      "bedrock:InvokeModelWithResponseStream",
    ],
    resources: [
      `arn:aws:bedrock:*:${Aws.ACCOUNT_ID}:inference-profile/*`,
      "arn:aws:bedrock:*::foundation-model/*",
    ],
  }),
);

const chatStreamingUrl = chatStreamingFunction.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: {
    allowedHeaders: [
      "accept",
      "accept-language",
      "authorization",
      "content-type",
      "user-agent",
      "x-request-id",
    ],
    allowedMethods: [HttpMethod.POST],
    allowedOrigins: chatStreamingAllowedOrigins,
    exposedHeaders: ["x-error-code", "x-request-id"],
    maxAge: Duration.seconds(600),
  },
  invokeMode: InvokeMode.RESPONSE_STREAM,
});

new CfnOutput(chatStreamingStack, "ChatStreamingFunctionUrl", {
  value: chatStreamingUrl.url,
});
