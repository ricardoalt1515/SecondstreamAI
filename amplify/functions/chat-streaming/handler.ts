import { generateText } from "ai";
import { createAgent } from "@/ai/agents/agent";
import { createLambdaDynamoDbArtifactStoreFromEnv } from "@/lib/artifacts/lambda-artifact-store";
import { createS3ArtifactPdfStorageFromEnv } from "@/lib/artifacts/pdf-storage";
import { isAuthRequiredError } from "@/lib/auth/errors";
import {
  createCognitoAccessTokenVerifier,
  createLambdaOwnerResolver,
} from "@/lib/auth/lambda-owner";
import { createChatPostHandler } from "@/lib/chat-handler";
import { createLambdaS3BlobStoreFromEnv } from "@/lib/storage/lambda-blob-store";
import { createLambdaDynamoDbChatStoreFromEnv } from "@/lib/storage/lambda-chat-store";
import { createChatStreamLogger, createCorrelationId } from "./observability";
import {
  buildCorsPreflightResponse,
  createLambdaRequest,
  isAllowedCorsOrigin,
  type LambdaFunctionUrlEvent,
  type LambdaResponseStream,
  pipeResponseToStream,
  rejectUnsupportedMethod,
} from "./runtime-adapter";

type StreamifiedHandler = (
  event: LambdaFunctionUrlEvent,
  responseStream: LambdaResponseStream,
) => Promise<void>;

type LambdaRuntime = {
  HttpResponseStream: {
    from: (
      responseStream: LambdaResponseStream,
      metadata: { statusCode?: number; headers?: Record<string, string> },
    ) => LambdaResponseStream;
  };
  streamifyResponse: (handler: StreamifiedHandler) => unknown;
};

type HandlerOptions = {
  decorateResponseStream?: (
    responseStream: LambdaResponseStream,
    metadata: { statusCode?: number; headers?: Record<string, string> },
  ) => LambdaResponseStream;
};

const lambdaRuntime = (globalThis as typeof globalThis & { awslambda?: LambdaRuntime }).awslambda;

const allowedOrigins = (process.env.CHAT_STREAM_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const requiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required Lambda chat environment variable: ${name}`);
  }
  return value;
};

const toHeaderSafe = (value: string): string => value.replace(/[^\x20-\x7E]/g, "?").slice(0, 256);

const configurationErrorResponse = (error: unknown): Response =>
  new Response("Lambda chat is not configured.", {
    status: 500,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "x-error-code": "CHAT_LAMBDA_CONFIGURATION_INVALID",
      "x-error-detail": toHeaderSafe(error instanceof Error ? error.message : "unknown"),
    },
  });

const authRequiredResponse = (): Response =>
  new Response("Sign in to continue.", {
    status: 401,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "x-error-code": "AUTH_REQUIRED",
    },
  });

const originRejectedResponse = (): Response =>
  new Response("Origin not allowed.", {
    status: 403,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "x-error-code": "ORIGIN_NOT_ALLOWED",
    },
  });

export const handleChatStreamingRequest = async (
  event: LambdaFunctionUrlEvent,
  responseStream: LambdaResponseStream,
  options: HandlerOptions = {},
): Promise<void> => {
  const method = event.requestContext?.http?.method ?? "GET";
  const origin = event.headers?.origin ?? event.headers?.Origin;
  const correlationId = event.requestContext?.requestId ?? createCorrelationId();
  const logger = createChatStreamLogger(correlationId);
  const decorateResponseStream =
    options.decorateResponseStream ?? lambdaRuntime?.HttpResponseStream.from;

  logger.info("request_start", { method, origin });

  if (method === "OPTIONS") {
    await pipeResponseToStream(
      buildCorsPreflightResponse({ origin, allowedOrigins }),
      responseStream,
      { decorateResponseStream },
    );
    return;
  }

  if (method !== "POST") {
    await pipeResponseToStream(rejectUnsupportedMethod(method), responseStream, {
      decorateResponseStream,
    });
    return;
  }

  if (!isAllowedCorsOrigin({ origin, allowedOrigins })) {
    await pipeResponseToStream(originRejectedResponse(), responseStream, {
      decorateResponseStream,
    });
    return;
  }

  let request: Request;
  try {
    request = createLambdaRequest(event);
  } catch (error) {
    await pipeResponseToStream(
      new Response(error instanceof Error ? error.message : "Invalid request.", {
        status: 400,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "x-error-code": "REQUEST_INVALID",
        },
      }),
      responseStream,
      { decorateResponseStream },
    );
    return;
  }

  try {
    const verifier = createCognitoAccessTokenVerifier({
      userPoolId: requiredEnv("COGNITO_USER_POOL_ID"),
      clientId: requiredEnv("COGNITO_USER_POOL_CLIENT_ID"),
    });
    const authorizationHeader = request.headers.get("authorization") ?? undefined;
    const getOwner = createLambdaOwnerResolver({ authorizationHeader, verifier });
    const owner = await getOwner();
    logger.info("auth_result", { success: true });

    const chatStore = createLambdaDynamoDbChatStoreFromEnv();
    const blobStore = createLambdaS3BlobStoreFromEnv(process.env as Record<string, string>, owner);
    const artifactStore = createLambdaDynamoDbArtifactStoreFromEnv();
    const pdfStorage = createS3ArtifactPdfStorageFromEnv();
    const handler = createChatPostHandler({
      chatStore,
      blobStore,
      artifactStore,
      pdfStorage,
      createAgent,
      generateText,
      getOwner: async () => owner,
    });
    const response = await handler({ request });
    logger.info("handler_result", { status: response.status });

    await pipeResponseToStream(response, responseStream, {
      decorateResponseStream,
    });
    logger.info("stream_event", { completed: true });
  } catch (error) {
    logger.error("stream_event", {
      errorCategory: error instanceof Error ? error.name : "unknown",
    });
    await pipeResponseToStream(
      isAuthRequiredError(error) ? authRequiredResponse() : configurationErrorResponse(error),
      responseStream,
      { decorateResponseStream },
    );
  }
};

export const handler = lambdaRuntime
  ? lambdaRuntime.streamifyResponse(handleChatStreamingRequest)
  : handleChatStreamingRequest;
