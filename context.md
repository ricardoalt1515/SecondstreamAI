# Code Context

## Files Retrieved

1. `amplify/backend.ts` (lines 1-38) - implemented Amplify Gen 2 backend custom stack, Lambda Function URL, and response streaming invoke mode.
2. `amplify/functions/streaming-canary/handler.ts` (lines 1-23) - implemented Lambda handler using `awslambda.streamifyResponse`.
3. `amplify/backend.test.ts` (lines 1-120) - unit tests/mocks asserting custom stack, `NodejsFunction`, Function URL, and output wiring.
4. `package.json` (lines 1-75) - dependency surface; important because CDK libraries are imported directly from backend code.
5. `node_modules/@aws-amplify/backend/lib/backend_factory.d.ts` (lines 20-29) - installed Amplify API confirming `backend.createStack(name)` exists for custom CDK resources and `backend.addOutput(...)` exists for client config output.
6. `node_modules/aws-cdk-lib/aws-lambda/lib/function-url.d.ts` (lines 21-35, 152-163) - installed CDK API confirming `InvokeMode.RESPONSE_STREAM` and `FunctionUrlOptions.invokeMode`.
7. `node_modules/aws-cdk-lib/aws-lambda-nodejs/lib/function.d.ts` (lines 7-64, 116-120) - installed CDK API confirming `NodejsFunction` supports TypeScript `entry`, `runtime`, `handler`, and bundling defaults.
8. `node_modules/@types/aws-lambda/handler.d.ts` (lines 175-266) - installed type docs confirming the Node Lambda runtime response streaming pattern.
9. `node_modules/@aws-amplify/backend/package.json` (lines 55-64) - confirms `aws-cdk-lib` and `constructs` are peer dependencies of `@aws-amplify/backend`, not bundled dependencies.

## Key Code

`amplify/backend.ts` currently does the expected minimal CDK wiring:

```ts
const streamingCanaryStack = backend.createStack("streaming-canary");

const streamingCanary = new NodejsFunction(
  streamingCanaryStack,
  "StreamingCanary",
  {
    entry: new URL("./functions/streaming-canary/handler.ts", import.meta.url)
      .pathname,
    runtime: Runtime.NODEJS_22_X,
    timeout: Duration.seconds(15),
  },
);

const streamingCanaryUrl = streamingCanary.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  invokeMode: InvokeMode.RESPONSE_STREAM,
});
```

Installed Amplify API supports this shape:

```ts
// node_modules/@aws-amplify/backend/lib/backend_factory.d.ts
createStack: (name: string) => Stack;
addOutput: (clientConfigPart: DeepPartialAmplifyGeneratedConfigs<ClientConfig>) => void;
```

Installed CDK API supports the Function URL streaming option:

```ts
// node_modules/aws-cdk-lib/aws-lambda/lib/function-url.d.ts
export declare enum InvokeMode {
  BUFFERED = "BUFFERED",
  RESPONSE_STREAM = "RESPONSE_STREAM",
}

export interface FunctionUrlOptions {
  readonly authType?: FunctionUrlAuthType;
  readonly cors?: FunctionUrlCorsOptions;
  readonly invokeMode?: InvokeMode;
}
```

Installed Lambda types document the handler-side requirement:

```ts
// node_modules/@types/aws-lambda/handler.d.ts
export const handler = awslambda.streamifyResponse(
  async (event, responseStream, context) => {
    responseStream.setContentType("text/plain");
    responseStream.write("Hello, world!");
    responseStream.end();
  },
);
```

`amplify/functions/streaming-canary/handler.ts` follows that pattern closely:

```ts
export const handler = awslambda.streamifyResponse(
  async (_event, responseStream) => {
    responseStream.setContentType?.("text/plain; charset=utf-8");

    for (let index = 1; index <= 5; index += 1) {
      responseStream.write(`chunk ${index} ${new Date().toISOString()}\n`);
      await sleep(1000);
    }

    responseStream.end();
  },
);
```

## Architecture

- `defineBackend({ auth, data, storage })` creates the normal Amplify Gen 2 resources.
- `backend.createStack("streaming-canary")` creates a custom CDK stack alongside Amplify-managed stacks. This is the right extension point for non-Amplify-native CDK resources.
- `NodejsFunction` bundles the TypeScript handler under `amplify/functions/streaming-canary/handler.ts` with esbuild defaults. The installed type docs say explicit `entry` is valid and recommended/reliable; the absolute path produced by `new URL(..., import.meta.url).pathname` is acceptable on macOS/Linux.
- `addFunctionUrl({ authType: NONE, invokeMode: RESPONSE_STREAM })` creates an unauthenticated Lambda Function URL that uses `InvokeWithResponseStream` instead of buffered invocation.
- The handler must also opt into response streaming with the global runtime decorator `awslambda.streamifyResponse(...)`; the current handler does that.
- `CfnOutput` exposes the URL in CloudFormation outputs. It does not put the URL into `amplify_outputs.json`; for a canary/smoke endpoint that may be enough. If app/client code needs this URL at runtime, Amplify's installed `backend.addOutput(...)` is the API to consider instead.

Assessment: the core approach is correct, simple, and modern for this repo: Amplify Gen 2 custom stack + CDK `NodejsFunction` + Function URL `InvokeMode.RESPONSE_STREAM` + `awslambda.streamifyResponse` is the expected combination.

Main risks / improvements:

1. **Dependency declaration risk:** `package.json` imports from `aws-cdk-lib` directly but does not list `aws-cdk-lib` or `constructs` directly. `@aws-amplify/backend` declares both as peer dependencies. The packages are installed locally, but best practice is to declare direct peer/runtime imports explicitly in this app's dev dependencies to avoid install/CI drift.
2. **Public URL:** `FunctionUrlAuthType.NONE` intentionally creates a public endpoint. Fine for a canary if acceptable; not appropriate for protected app functionality without additional controls.
3. **Output destination:** `CfnOutput` is enough for stack inspection/manual smoke tests. It will not be part of generated Amplify client config. Use `backend.addOutput` only if the frontend or runtime config should consume it.
4. **Types in handler:** the local manual `declare const awslambda` works, but the installed `@types/aws-lambda` pattern is `import 'aws-lambda';` and then use the global `awslambda` types. The current manual type is acceptable and avoids adding a direct type dependency, but it is less canonical.
5. **`setContentType?.` optional chaining:** Lambda's `HttpResponseStream.setContentType` is documented as required. Optional chaining is harmless but not necessary.
6. **No error/finally:** If an error happens before `responseStream.end()`, runtime behavior may close the stream, but a canary could use `try/finally` if you want deterministic stream closure. Not required for this simple smoke handler.

## Start Here

Open `amplify/backend.ts` first. It contains the decisive integration points: custom Amplify stack creation, `NodejsFunction` construction, Function URL auth mode, streaming invoke mode, and CloudFormation output.

## Supervisor coordination

No supervisor decision needed. No files were edited except this requested `context.md` report.
