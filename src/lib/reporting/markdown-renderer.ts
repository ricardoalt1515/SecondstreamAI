import type { ReportBundleRequest } from "@/lib/reporting/schemas";

const FORBIDDEN_CLAIM_PATTERNS = [
  /\bfinal\s+rcra\b/i,
  /\bdot\s+packaging\s+spec\b/i,
  /\bfinal\s+ldr\b/i,
  /\btsdf\s+route\b/i,
  /\b\$\d+/,
  /\bvendor\b/i,
];

const assertNoForbiddenClaims = (markdown: string): void => {
  for (const pattern of FORBIDDEN_CLAIM_PATTERNS) {
    if (pattern.test(markdown)) {
      throw new Error("Generated markdown contains forbidden Discovery claims.");
    }
  }
};

export const renderSnapshotInline = (request: ReportBundleRequest): string => {
  const { snapshot, qualificationGate, safetyFlags } = request;
  const safetySummary =
    safetyFlags.length > 0
      ? `Safety: ${safetyFlags.map((flag) => `${flag.severity.toUpperCase()} — ${flag.title}`).join("; ")}.`
      : "Safety: No safety flags raised.";

  const gateSummary =
    qualificationGate.status === "closed"
      ? `Qualification gate: CLOSED${qualificationGate.blocker ? ` — ${qualificationGate.blocker}` : ""}.`
      : qualificationGate.status === "open-with-conditions"
        ? "Qualification gate: OPEN WITH CONDITIONS."
        : "Qualification gate: OPEN.";

  return `${snapshot.headline}. **${snapshot.summary}** ${snapshot.nextAction}. ${safetySummary} ${gateSummary}`;
};

export const renderFullDiscoveryMarkdown = (request: ReportBundleRequest): string => {
  const safetyBlock =
    request.safetyFlags.length > 0
      ? request.safetyFlags
          .map((flag) => `- [${flag.severity.toUpperCase()}] ${flag.title}: ${flag.details}`)
          .join("\n")
      : "- No safety flags raised.";

  const sections = request.executiveReport.sections
    .map(
      (section, index) =>
        `## ${index + 1}. ${section.title}\n\n**Lead:** ${section.lead}\n\n${section.body}\n\nEvidence: ${section.evidenceTags.join(", ")}`,
    )
    .join("\n\n");

  const markdown = [
    `# Full Discovery Report — ${request.executiveReport.customerSlug}`,
    ``,
    `## Qualification Gate`,
    `- Status: ${request.qualificationGate.status.toUpperCase()}`,
    request.qualificationGate.blocker
      ? `- Blocker: ${request.qualificationGate.blocker}`
      : "- Blocker: None",
    ``,
    `## Safety Flags`,
    safetyBlock,
    ``,
    `## Snapshot`,
    renderSnapshotInline(request),
    ``,
    sections,
    ``,
    `## Evidence Tags`,
    request.evidenceTags.map((tag) => `- ${tag}`).join("\n"),
    ``,
    `## Discovery Gotchas`,
    request.gotchas.length > 0
      ? request.gotchas.map((gotcha) => `- ${gotcha}`).join("\n")
      : "- None",
  ].join("\n");

  assertNoForbiddenClaims(markdown);
  return markdown;
};
