import { defineBackend } from "@aws-amplify/backend";
import { CfnOutput, Duration } from "aws-cdk-lib";
import { FunctionUrlAuthType, InvokeMode, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
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
