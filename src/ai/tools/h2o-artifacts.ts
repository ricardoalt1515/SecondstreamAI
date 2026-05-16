import { tool } from "ai";
import type { ZodTypeAny } from "zod";
import { z } from "zod";
import type { ArtifactKind, ArtifactStore } from "@/lib/artifacts/artifact-store";
import { pdfFilename } from "@/lib/artifacts/payloads";
import { renderArtifactPdf } from "@/lib/artifacts/pdf-renderer-dispatch";
import type { ArtifactPdfStorage } from "@/lib/artifacts/pdf-storage";
import type { OwnerContext } from "@/lib/auth/owner-context";

const customerSchema = z.object({
  name: z.string().min(1),
  location: z.string().optional(),
  slug: z.string().optional(),
});

const stageSchema = z.enum(["Lead", "Qualify", "Scope", "Position", "Propose", "Close"]);
const confidenceSchema = z.enum(["HIGH", "MEDIUM", "LOW", "MEDIUM-LOW"]);

export const fieldBriefInputSchema = z.object({
  customer: customerSchema,
  stage: stageSchema,
  confidence: confidenceSchema.optional(),
  date: z.string().optional(),
  stopFlags: z
    .array(z.object({ title: z.string().min(1), summary: z.string().min(1) }))
    .default([]),
  sections: z.object({
    whatThisIs: z.object({ insight: z.string().min(1), body: z.string().min(1) }),
    whatWeWouldPropose: z.object({
      insight: z.string().min(1),
      recommendedApproach: z.string().min(1),
      winWinArguments: z
        .array(z.object({ lead: z.string().min(1), body: z.string().min(1) }))
        .min(1)
        .max(3),
      costOfAlternativeRows: z
        .array(
          z.object({
            component: z.string().min(1),
            theirPath: z.string().min(1),
            ourProposal: z.string().min(1),
            isTotal: z.boolean().optional(),
          }),
        )
        .min(1),
      dealSizeSensitivity: z.string().optional(),
    }),
    whatCouldKillIt: z.object({
      insight: z.string().min(1),
      risks: z
        .array(
          z.object({
            name: z.string().min(1),
            mechanism: z.string().min(1),
            mitigation: z.string().min(1),
          }),
        )
        .min(1)
        .max(3),
    }),
    doThisNext: z.object({
      insight: z.string().min(1),
      actions: z
        .array(
          z.object({
            title: z.string().min(1),
            timeframe: z.string().min(1),
            body: z.string().min(1),
          }),
        )
        .length(3),
    }),
  }),
});

export const playbookInputSchema = z.object({
  customer: customerSchema,
  stage: stageSchema.optional(),
  title: z.string().default("Conversation Playbook"),
  orientation: z.string().optional(),
  themes: z
    .array(
      z.object({
        title: z.string().min(1),
        framing: z.string().optional(),
        questions: z.array(z.string().min(1)).min(1).max(5),
        substreamTag: z.string().optional(),
      }),
    )
    .min(1)
    .max(11),
});

export const analyticalReadInputSchema = z.object({
  customer: customerSchema,
  title: z.string().default("Analytical Read"),
  summary: z.string().min(1),
  sections: z
    .array(
      z.object({
        heading: z.string().min(1),
        body: z.string().min(1),
        evidenceTags: z.array(z.string()).default([]),
        table: z.array(z.record(z.string(), z.string())).optional(),
      }),
    )
    .min(1),
});

export const proposalShellInputSchema = z.object({
  customer: customerSchema,
  title: z.string().default("Proposal Shell"),
  executiveSummary: z.string().min(1),
  proposedScope: z.array(z.string().min(1)).min(1),
  sizingAndPricing: z.string().min(1),
  schedule: z.string().min(1),
  commitments: z.object({
    commitTo: z.array(z.string()).default([]),
    doNotCommitYet: z.array(z.string()).default([]),
  }),
  fundingPathway: z.string().optional(),
  riskAllocation: z.string().optional(),
});

// Single source of truth for kind → input schema. Imported by the download
// route to validate persisted payloads before rendering (defensive against
// schema drift between write and read).
export const ARTIFACT_INPUT_SCHEMAS: Record<ArtifactKind, ZodTypeAny> = {
  "field-brief": fieldBriefInputSchema,
  playbook: playbookInputSchema,
  "analytical-read": analyticalReadInputSchema,
  "proposal-shell": proposalShellInputSchema,
};

type ArtifactFormat = {
  format: "pdf";
  mediaType: "application/pdf";
  filename: string;
  downloadUrl: string;
};

export type ArtifactToolResult = {
  artifactId: string;
  artifactType: ArtifactKind;
  title: string;
  status: "ready";
  createdAt: string;
  formats: ArtifactFormat[];
};

export type ArtifactRequestContext = {
  owner: OwnerContext;
  threadId: string;
  artifactStore: ArtifactStore;
  pdfStorage: ArtifactPdfStorage;
  baseUrl?: string;
};

const titleFor = (
  kind: ArtifactKind,
  payload: { title?: string; customer?: { name?: string } },
): string => {
  if (payload.title) {
    return payload.title;
  }
  if (kind === "field-brief") {
    return `${payload.customer?.name ?? "Customer"} Field Brief`;
  }
  if (kind === "playbook") {
    return "Conversation Playbook";
  }
  if (kind === "analytical-read") {
    return "Analytical Read";
  }
  return "Proposal Shell";
};

const slugFor = (payload: { customer?: { slug?: string; name?: string } }): string | null =>
  payload.customer?.slug ?? payload.customer?.name ?? null;

const pdfDownloadUrl = (ctx: ArtifactRequestContext, kind: ArtifactKind): string => {
  const path = `/api/threads/${encodeURIComponent(ctx.threadId)}/artifacts/${kind}/pdf`;
  return ctx.baseUrl ? new URL(path, ctx.baseUrl).toString() : path;
};

const persistArtifact = async <
  TPayload extends { title?: string; customer?: { name?: string; slug?: string } },
>(
  ctx: ArtifactRequestContext,
  kind: ArtifactKind,
  payload: TPayload,
): Promise<ArtifactToolResult> => {
  const customerSlug = slugFor(payload);
  const title = titleFor(kind, payload);

  // Eager render: produce the PDF bytes here so any render-time failure
  // (missing field, invalid value, library crash) surfaces as a tool-error
  // the model can retry against. The download route never has to call into
  // @react-pdf again — it just streams these bytes from S3.
  const pdfBytes = await renderArtifactPdf(kind, payload);
  await ctx.pdfStorage.put({
    bytes: pdfBytes,
    kind,
    threadId: ctx.threadId,
    userId: ctx.owner.userId,
  });

  const artifact = await ctx.artifactStore.putArtifact(
    {
      customerSlug,
      kind,
      payload,
      payloadVersion: 1,
      status: "ready",
      threadId: ctx.threadId,
      title,
    },
    ctx.owner,
  );

  const formats: ArtifactFormat[] = [
    {
      format: "pdf",
      mediaType: "application/pdf",
      filename: pdfFilename(artifact.customerSlug ?? customerSlug, kind),
      downloadUrl: pdfDownloadUrl(ctx, kind),
    },
  ];

  return {
    artifactId: artifact.id,
    artifactType: kind,
    title: artifact.title,
    status: "ready",
    createdAt: artifact.createdAtIso,
    formats,
  };
};

export const createH2oArtifactTools = (ctx: ArtifactRequestContext) => ({
  generateFieldBrief: tool({
    description:
      "Generate and persist the Field Brief PDF for the current opportunity. Returns a real PDF download URL.",
    inputSchema: fieldBriefInputSchema,
    execute: async (input) => persistArtifact(ctx, "field-brief", input),
  }),

  generatePlaybook: tool({
    description:
      "Generate and persist the Conversation Playbook PDF for the current opportunity. Returns a real PDF download URL.",
    inputSchema: playbookInputSchema,
    execute: async (input) => persistArtifact(ctx, "playbook", input),
  }),

  generateAnalyticalRead: tool({
    description:
      "Generate and persist the Analytical Read PDF for the current opportunity. Returns a real PDF download URL.",
    inputSchema: analyticalReadInputSchema,
    execute: async (input) => persistArtifact(ctx, "analytical-read", input),
  }),

  generateProposalShell: tool({
    description:
      "Generate and persist the Proposal Shell PDF for the current opportunity. Returns a real PDF download URL.",
    inputSchema: proposalShellInputSchema,
    execute: async (input) => persistArtifact(ctx, "proposal-shell", input),
  }),
});
