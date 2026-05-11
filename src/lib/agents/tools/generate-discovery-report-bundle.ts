import { tool } from "ai";
import {
  type GenerateReportBundleDeps,
  generateReportBundle,
} from "@/lib/reporting/bundle-generator";
import { type ReportBundleRequest, ReportBundleRequestSchema } from "@/lib/reporting/schemas";

export class GenerateDiscoveryReportBundleError extends Error {
  constructor(
    readonly code: "BUNDLE_PRECONDITIONS_MISSING" | "BUNDLE_GENERATION_FAILED",
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "GenerateDiscoveryReportBundleError";
  }
}

export type GenerateDiscoveryReportBundleDeps = {
  generateBundle: (request: ReportBundleRequest) => ReturnType<typeof generateReportBundle>;
};

const hasAllPrerequisites = (request: ReportBundleRequest): boolean =>
  request.prerequisites.hasCommercialShaping &&
  request.prerequisites.hasDiscoveryGapAnalysis &&
  request.prerequisites.hasSafetyFlagging &&
  request.prerequisites.hasQualificationGate;

export const runGenerateDiscoveryReportBundle = async (
  request: ReportBundleRequest,
  deps: GenerateDiscoveryReportBundleDeps,
) => {
  console.info("[discovery-report-bundle] tool:start", {
    bundleId: request.bundleId,
    threadId: request.threadId,
    qualificationGate: request.qualificationGate.status,
    safetyFlags: request.safetyFlags.length,
  });

  if (!hasAllPrerequisites(request)) {
    console.warn("[discovery-report-bundle] tool:preconditions-missing", {
      bundleId: request.bundleId,
      prerequisites: request.prerequisites,
    });

    throw new GenerateDiscoveryReportBundleError(
      "BUNDLE_PRECONDITIONS_MISSING",
      "Cannot generate discovery report bundle without all prerequisite skill outputs.",
    );
  }

  try {
    const { manifest, snapshotInline } = await deps.generateBundle(request);
    console.info("[discovery-report-bundle] tool:success", {
      bundleId: request.bundleId,
      files: manifest.files.map((file) => ({
        artifactType: file.artifactType,
        filename: file.filename,
      })),
    });

    return {
      snapshotInline,
      manifest,
      presentFiles: manifest.files.map((file) => ({
        filename: file.filename,
        mediaType: file.mediaType,
        url: file.url,
      })),
    };
  } catch (error) {
    if (error instanceof GenerateDiscoveryReportBundleError) {
      console.error("[discovery-report-bundle] tool:error", {
        bundleId: request.bundleId,
        code: error.code,
        message: error.message,
      });
      throw error;
    }

    console.error("[discovery-report-bundle] tool:error", {
      bundleId: request.bundleId,
      code: "BUNDLE_GENERATION_FAILED",
      message: error instanceof Error ? error.message : String(error),
    });

    throw new GenerateDiscoveryReportBundleError(
      "BUNDLE_GENERATION_FAILED",
      "Failed to generate discovery report bundle.",
      error,
    );
  }
};

const defaultPdfRenderer: GenerateReportBundleDeps["renderExecutivePdf"] = async (request) => {
  const text = [
    `Executive Discovery Report`,
    `Customer: ${request.executiveReport.customerSlug}`,
    `Stream: ${request.executiveReport.streamSlug}`,
    `Date: ${request.executiveReport.reportDate}`,
  ].join("\n");
  return Buffer.from(text, "utf8");
};

export const createGenerateDiscoveryReportBundleTool = (deps: {
  bundleDeps: Omit<GenerateReportBundleDeps, "renderExecutivePdf">;
  renderExecutivePdf?: GenerateReportBundleDeps["renderExecutivePdf"];
}) =>
  tool({
    description:
      "Generate proactive Discovery report bundle: inline snapshot + executive PDF + full markdown with present_files-ready manifest.",
    inputSchema: ReportBundleRequestSchema,
    execute: async (input) => {
      return runGenerateDiscoveryReportBundle(input, {
        generateBundle: (bundleRequest) =>
          generateReportBundle(bundleRequest, {
            ...deps.bundleDeps,
            renderExecutivePdf: deps.renderExecutivePdf ?? defaultPdfRenderer,
          }),
      });
    },
  });
