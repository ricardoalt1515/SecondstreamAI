import { z } from "zod";

const qualificationGateStatusSchema = z.enum(["open", "open-with-conditions", "closed"]);

const safetyFlagSeveritySchema = z.enum(["attention", "specialist", "stop"]);

const prerequisitesSchema = z.object({
  hasCommercialShaping: z.boolean(),
  hasDiscoveryGapAnalysis: z.boolean(),
  hasSafetyFlagging: z.boolean(),
  hasQualificationGate: z.boolean(),
});

const snapshotSchema = z.object({
  headline: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  nextAction: z.string().trim().min(1),
});

const executiveSectionSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  lead: z.string().trim().min(1),
  body: z.string().trim().min(1),
  evidenceTags: z.array(z.string().trim().min(1)).min(1),
});

const executiveReportSchema = z.object({
  customerSlug: z.string().trim().min(1),
  streamSlug: z.string().trim().min(1),
  reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sections: z.array(executiveSectionSchema).min(1),
});

const safetyFlagSchema = z.object({
  severity: safetyFlagSeveritySchema,
  title: z.string().trim().min(1),
  details: z.string().trim().min(1),
});

export const ReportBundleRequestSchema = z.object({
  bundleId: z.string().trim().min(1),
  threadId: z.string().trim().min(1),
  generatedAt: z.string().datetime(),
  prerequisites: prerequisitesSchema,
  qualificationGate: z.object({
    status: qualificationGateStatusSchema,
    blocker: z.string().trim().optional(),
  }),
  safetyFlags: z.array(safetyFlagSchema),
  snapshot: snapshotSchema,
  executiveReport: executiveReportSchema,
  evidenceTags: z.array(z.string().trim().min(1)).min(1),
  gotchas: z.array(z.string().trim().min(1)),
});

const manifestFileSchema = z.object({
  artifactType: z.enum(["executive-pdf", "full-markdown"]),
  filename: z.string().trim().min(1),
  mediaType: z.string().trim().min(1),
  url: z.string().url(),
});

export const ReportBundleManifestSchema = z
  .object({
    bundleId: z.string().trim().min(1),
    files: z.array(manifestFileSchema).length(2),
  })
  .superRefine((value, ctx) => {
    const [first, second] = value.files;
    if (!first || !second) {
      return;
    }

    const validOrder =
      first.artifactType === "executive-pdf" &&
      first.mediaType === "application/pdf" &&
      second.artifactType === "full-markdown" &&
      second.mediaType === "text/markdown";

    if (!validOrder) {
      ctx.addIssue({
        code: "custom",
        message: "Manifest files must be ordered PDF first, markdown second.",
      });
    }
  });

export type QualificationGateStatus = z.infer<typeof qualificationGateStatusSchema>;
export type SafetyFlagSeverity = z.infer<typeof safetyFlagSeveritySchema>;
export type ReportBundleRequest = z.infer<typeof ReportBundleRequestSchema>;
export type ReportBundleManifest = z.infer<typeof ReportBundleManifestSchema>;
