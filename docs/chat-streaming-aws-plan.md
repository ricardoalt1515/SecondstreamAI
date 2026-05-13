# Chat Streaming on AWS Plan

## Context

SecondstreamAI runs a Next.js 16 App Router application on AWS Amplify Hosting `WEB_COMPUTE` with Amplify Gen 2 backend services for Cognito Auth, Data/AppSync, and Storage. The chat endpoint is `POST /api/chat` in `app/api/chat/route.ts`, backed by `src/lib/chat-handler.ts` and AI SDK v6 `ToolLoopAgent` on Amazon Bedrock.

Production Bedrock authentication was fixed with:

- `src/lib/bedrock-provider.ts` using `credentialProvider: fromNodeProviderChain()`.
- Amplify branch `main` compute role `SecondstreamAIAmplifySSRComputeBedrockRole`.
- Bedrock invoke policy `SecondstreamAIAmplifyBedrockInvokePolicy` scoped to Claude Sonnet 4.6 inference profile/model ARNs.

The chat now responds in production, but Amplify Hosting delivers the assistant response all at once instead of progressively streaming.

## Confirmed Finding

Amplify Hosting `WEB_COMPUTE` buffers streaming responses for this app.

Evidence:

- The chat code still uses AI SDK streaming correctly:
  - `createUIMessageStream()`
  - `writer.merge(result.toUIMessageStream(...))`
  - `createUIMessageStreamResponse({ stream })`
  - `useChat` + `DefaultChatTransport`
  - `export const dynamic = "force-dynamic"`
- A temporary `GET /api/stream-canary` endpoint emitted five SSE chunks one second apart.
- Local `curl -N --no-buffer http://localhost:3000/api/stream-canary` received chunks progressively.
- Production `curl -N --no-buffer https://main.d22icjbzj7x471.amplifyapp.com/api/stream-canary` displayed all five chunks at once, while timestamps showed the server generated them one second apart.

Conclusion: the problem is hosting/runtime buffering, not Bedrock, AI SDK, or the chat handler.

## Constraint

The company is AWS-only. Vercel or non-AWS hosting is not an option.

## Recommended Strategy

Use a streaming-capable AWS runtime for the chat endpoint while keeping the existing Amplify frontend and backend.

Preferred path:

1. Spike a standalone Lambda Function URL with `InvokeMode=RESPONSE_STREAM`.
2. Validate real progressive chunks with `curl -N --no-buffer`.
3. If the spike passes, move only `/api/chat` to the streaming Lambda path while preserving the existing chat core.
4. If Function URL is too limited for production governance, graduate to API Gateway REST response streaming + Lambda.

## Why This Strategy

The core chat module already has useful seams:

```ts
createChatPostHandler({
  chatStore,
  blobStore,
  agent,
  generateText,
  getOwner,
});
```

Do not rewrite the chat domain. Preserve:

- `createChatPostHandler`
- `ChatStore`
- `BlobStore`
- `StreamAgent`
- AI SDK UI message stream protocol

Change the failing transport/runtime adapter around the module.

## Options Considered

### Keep Amplify Hosting and accept no streaming

Good if streaming is not a product requirement. Rejected for now because streaming is considered important to user experience.

### Lambda Function URL with `RESPONSE_STREAM`

Best first AWS-native spike.

Pros:

- Serverless.
- Cheap at idle.
- Official Lambda response streaming support.
- Fewest moving parts.
- Good fit for validating `/api/chat` streaming.

Cons:

- Need to handle CORS/auth carefully if cross-origin.
- Lambda duration is billed while stream is open.
- Function URL response streaming is not supported from Lambda inside a VPC.
- Production governance is lighter than API Gateway.

### API Gateway REST response streaming + Lambda

Good production upgrade if needed.

Pros:

- Better API management.
- Custom domains, auth, throttling, observability, WAF/rate limits.

Cons:

- More ceremony and configuration.
- More cost/pieces than Function URL.

### ECS/Fargate or App Runner

Good fallback for long-lived/high-concurrency agents.

Pros:

- Natural HTTP streaming.
- More runtime control.

Cons:

- More operations.
- Higher idle cost.
- More deployment complexity.

### WebSockets/AppSync/Amplify AI Conversations

Not recommended for this fix. They would change the chat contract and introduce avoidable complexity.

## Spike Plan

### Phase 1 — Lambda streaming canary

Create a separate Lambda Function URL with `InvokeMode=RESPONSE_STREAM` that emits five chunks one second apart.

Current implementation:

- `amplify/functions/streaming-canary/handler.ts` — public temporary canary handler that writes five plaintext chunks one second apart.
- `amplify/backend.ts` — custom Amplify Gen 2 CDK stack `streaming-canary` with a `NodejsFunction` and Function URL `invokeMode: RESPONSE_STREAM`.
- CloudFormation output: `StreamingCanaryFunctionUrl`.

Deploy/update sandbox or production backend:

```bash
nvm use
npx ampx sandbox
```

Find the emitted `StreamingCanaryFunctionUrl`, then validate:

```bash
curl -N --no-buffer <StreamingCanaryFunctionUrl>
```

Expected output shape:

```text
chunk 1 2026-05-13T00:00:00.000Z
chunk 2 2026-05-13T00:00:01.000Z
chunk 3 2026-05-13T00:00:02.000Z
chunk 4 2026-05-13T00:00:03.000Z
chunk 5 2026-05-13T00:00:04.000Z
```

Pass condition: chunks arrive one by one over ~5 seconds, not all at process end.

Security note: the Function URL uses `FunctionUrlAuthType.NONE` only because this is a temporary streaming transport canary that returns non-sensitive synthetic data. Do not put chat traffic or user data behind this public canary.

### Phase 2 — Portable chat runtime assessment

Inspect and decide how to adapt these seams outside Amplify Hosting:

- Auth:
  - Current `getCurrentOwner()` depends on Next/Amplify server cookies.
  - Likely need `getOwnerFromCognitoJwt` using `Authorization: Bearer <token>` or same-domain cookies if routed through a shared domain.
- Persistence:
  - Current Amplify stores may depend on `generateServerClientUsingCookies`.
  - If not portable to Lambda, add a `ChatStore` adapter using AppSync/IAM or direct data access.
- Blob storage:
  - Existing `S3BlobStore` can be used if attachments/report blobs need a Lambda-compatible implementation.
- Agent:
  - Reuse current Bedrock provider and `ToolLoopAgent`.

### Phase 3 — Chat Lambda spike

Wrap or reuse `createChatPostHandler` in the streaming Lambda and preserve the AI SDK UI message stream response format.

Validate:

- Cognito owner context works.
- Thread/message persistence works.
- AI response streams progressively.
- Refresh/reopen session works.
- New stream works.
- Attachments still work if in scope.
- Logs include request id and timing for auth, persistence, Bedrock first byte, and stream close.

### Phase 4 — Production hardening

Choose one:

- Keep Function URL if sufficient.
- Add custom domain/CloudFront behavior if same-domain routing is needed.
- Move to API Gateway REST response streaming if stronger auth/throttling/governance is required.

## Cleanup

The temporary `app/api/stream-canary/route.ts` endpoint and its proxy bypass should be removed after the AWS streaming runtime decision is made.
