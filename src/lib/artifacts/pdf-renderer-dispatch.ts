import type { ArtifactKind } from "@/lib/artifacts/artifact-store";
import type {
  AnalyticalReadPayload,
  FieldBriefPayload,
  PlaybookPayload,
  ProposalShellPayload,
} from "@/lib/artifacts/payloads";
import { renderAnalyticalReadPdf } from "@/lib/artifacts/pdf/analytical-read-document";
import { renderFieldBriefPdf } from "@/lib/artifacts/pdf/field-brief-document";
import { renderPlaybookPdf } from "@/lib/artifacts/pdf/playbook-document";
import { renderProposalShellPdf } from "@/lib/artifacts/pdf/proposal-shell-document";

// Single entry point used by the eager tool execute path. Centralising the
// kind → renderer mapping prevents the four call sites (Lambda tool execute,
// route fallback, tests, future workers) from drifting.
export const renderArtifactPdf = async (kind: ArtifactKind, payload: unknown): Promise<Buffer> => {
  switch (kind) {
    case "field-brief":
      return renderFieldBriefPdf(payload as FieldBriefPayload);
    case "playbook":
      return renderPlaybookPdf(payload as PlaybookPayload);
    case "analytical-read":
      return renderAnalyticalReadPdf(payload as AnalyticalReadPayload);
    case "proposal-shell":
      return renderProposalShellPdf(payload as ProposalShellPayload);
    default: {
      // Exhaustive check — TypeScript enforces this at compile time.
      const _exhaustive: never = kind;
      throw new Error(`No PDF renderer registered for artifact kind ${_exhaustive}`);
    }
  }
};
