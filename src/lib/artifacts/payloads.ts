import type { ArtifactKind } from "./artifact-store";

export type ArtifactCustomer = {
  name: string;
  location?: string;
  slug?: string;
};

export type FieldBriefPayload = {
  customer: ArtifactCustomer;
  stage: string;
  confidence?: string;
  date?: string;
  stopFlags?: Array<{ title: string; summary: string }>;
  sections: {
    whatThisIs: { insight: string; body: string };
    whatWeWouldPropose: {
      insight: string;
      recommendedApproach: string;
      winWinArguments: Array<{ lead: string; body: string }>;
      costOfAlternativeRows: Array<{
        component: string;
        theirPath: string;
        ourProposal: string;
        isTotal?: boolean;
      }>;
      dealSizeSensitivity?: string;
    };
    whatCouldKillIt: {
      insight: string;
      risks: Array<{ name: string; mechanism: string; mitigation: string }>;
    };
    doThisNext: {
      insight: string;
      actions: Array<{ title: string; timeframe: string; body: string }>;
    };
  };
};

export type PlaybookPayload = {
  customer: ArtifactCustomer;
  stage?: string;
  title?: string;
  orientation?: string;
  themes: Array<{
    title: string;
    framing?: string;
    questions: string[];
    substreamTag?: string;
  }>;
};

export type AnalyticalReadPayload = {
  customer: ArtifactCustomer;
  title?: string;
  summary: string;
  sections: Array<{
    heading: string;
    body: string;
    evidenceTags?: string[];
    table?: Array<Record<string, string>>;
  }>;
};

export type ProposalShellPayload = {
  customer: ArtifactCustomer;
  title?: string;
  executiveSummary: string;
  proposedScope: string[];
  sizingAndPricing: string;
  schedule: string;
  commitments: {
    commitTo?: string[];
    doNotCommitYet?: string[];
  };
  fundingPathway?: string;
  riskAllocation?: string;
};

const slugify = (value: string): string => {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "artifact";
};

export const pdfFilename = (customerSlug: string | null | undefined, kind: ArtifactKind): string =>
  `${slugify(customerSlug ?? "artifact")}_${kind}.pdf`;
