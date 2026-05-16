import { S3Client } from "@aws-sdk/client-s3";
import { ARTIFACT_INPUT_SCHEMAS } from "@/ai/tools/h2o-artifacts";
import { getEnv } from "@/config/env";
import { createAmplifyArtifactStore } from "@/lib/artifacts/amplify-artifact-store";
import type { ArtifactStore } from "@/lib/artifacts/artifact-store";
import { isArtifactKind } from "@/lib/artifacts/artifact-store";
import { pdfFilename } from "@/lib/artifacts/payloads";
import { renderArtifactPdf } from "@/lib/artifacts/pdf-renderer-dispatch";
import { type ArtifactPdfStorage, S3ArtifactPdfStorage } from "@/lib/artifacts/pdf-storage";
import { isAuthRequiredError } from "@/lib/auth/errors";
import type { OwnerContext } from "@/lib/auth/owner-context";
import { getCurrentOwner } from "@/lib/auth/server";
import { createAmplifyChatStore } from "@/lib/storage/amplify-chat-store";
import type { StoredThread } from "@/lib/storage/chat-store-types";

export const dynamic = "force-dynamic";

type RouteParams = {
  threadId: string;
  kind: string;
  format: string;
};

type RouteContext = {
  params: Promise<RouteParams>;
};

type ArtifactDownloadDeps = {
  artifactStore: ArtifactStore;
  pdfStorage: ArtifactPdfStorage;
  getOwner: () => Promise<OwnerContext>;
  getThread: (threadId: string) => Promise<StoredThread | null>;
};

const textResponse = (body: string, status: number, code: string): Response =>
  new Response(body, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "x-error-code": code,
    },
  });

const pdfHeaders = (filename: string): Record<string, string> => ({
  "cache-control": "private, no-store",
  "content-disposition": `attachment; filename="${filename}"`,
  "content-type": "application/pdf",
});

export const createArtifactDownloadHandler = (deps: ArtifactDownloadDeps) => {
  return async (_request: Request, context: RouteContext): Promise<Response> => {
    let owner: OwnerContext;
    try {
      owner = await deps.getOwner();
    } catch (error) {
      if (isAuthRequiredError(error)) {
        return textResponse("Sign in to continue.", 401, "AUTH_REQUIRED");
      }
      throw error;
    }

    const { format, kind, threadId } = await context.params;
    if (!isArtifactKind(kind) || format !== "pdf") {
      return textResponse("Invalid artifact route.", 400, "ARTIFACT_ROUTE_INVALID");
    }

    const thread = await deps.getThread(threadId);
    if (!thread || thread.resourceId !== owner.userId) {
      return textResponse("Artifact not found.", 404, "ARTIFACT_NOT_FOUND");
    }

    const artifact = await deps.artifactStore.getActiveArtifact(threadId, kind, owner);
    if (!artifact || artifact.status !== "ready") {
      return textResponse("Artifact not found.", 404, "ARTIFACT_NOT_FOUND");
    }

    const filename = pdfFilename(artifact.customerSlug, artifact.kind);

    // Fast path: tool execute already rendered and uploaded the PDF to S3.
    // Stream those bytes back without touching @react-pdf/renderer.
    const stored = await deps.pdfStorage.get({
      kind: artifact.kind,
      threadId,
      userId: owner.userId,
    });
    if (stored) {
      return new Response(new Uint8Array(stored), {
        status: 200,
        headers: pdfHeaders(filename),
      });
    }

    // Fallback for legacy rows created before PR2 (lazy render). Validate the
    // payload first so a malformed one returns 422 instead of crashing the
    // renderer with an opaque 500.
    const schema = ARTIFACT_INPUT_SCHEMAS[artifact.kind];
    const parsed = schema.safeParse(artifact.payload);
    if (!parsed.success) {
      const summary = parsed.error.issues
        .map((issue) => `${issue.path.join(".") || "(root)"} ${issue.message}`)
        .join("; ");
      console.error("[artifact-route] payload validation failed", {
        artifactId: artifact.id,
        kind: artifact.kind,
        issues: summary,
      });
      return textResponse(
        `Stored artifact payload is incomplete. The agent needs to regenerate it. Missing: ${summary}`,
        422,
        "ARTIFACT_PAYLOAD_INVALID",
      );
    }

    const pdf = await renderArtifactPdf(artifact.kind, parsed.data);
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: pdfHeaders(filename),
    });
  };
};

// Module-init must not validate env vars (tests import this module without
// CHAT_ATTACHMENTS_S3_BUCKET set). Build the production handler lazily on the
// first request instead.
let productionHandler: ReturnType<typeof createArtifactDownloadHandler> | null = null;
const getProductionHandler = (): ReturnType<typeof createArtifactDownloadHandler> => {
  if (productionHandler) return productionHandler;
  const env = getEnv();
  const chatStore = createAmplifyChatStore();
  const artifactStore = createAmplifyArtifactStore();
  // Use the SAME prefix the Lambda writer uses (`LAMBDA_CHAT_BLOB_PREFIX`) so
  // the fast-path read matches the eager-write key shape. Default mirrors the
  // CDK value in `amplify/backend.ts`. IAM already grants the Lambda role
  // `lambda-chat/attachments/*` on this bucket.
  const pdfPrefix = process.env.LAMBDA_CHAT_BLOB_PREFIX ?? "lambda-chat/attachments/";
  const pdfStorage: ArtifactPdfStorage = new S3ArtifactPdfStorage({
    bucket: env.CHAT_ATTACHMENTS_S3_BUCKET,
    client: new S3Client({ region: env.AWS_REGION }),
    prefix: pdfPrefix,
  });
  productionHandler = createArtifactDownloadHandler({
    artifactStore,
    pdfStorage,
    getOwner: getCurrentOwner,
    getThread: (threadId) => chatStore.getThreadById(threadId),
  });
  return productionHandler;
};

export const GET = (request: Request, context: RouteContext): Promise<Response> =>
  getProductionHandler()(request, context);
