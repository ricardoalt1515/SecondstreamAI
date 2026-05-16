# Tasks: Add H2O PDF Artifact Package

## Pivot Summary

The SDD has been corrected from Markdown-first to PDF-first. PR1/PR2 created useful foundation, but the product contract now requires four real PDFs as artifact deliverables.

Docs confirming PDF stack and prior plan:

- `docs/agent-audit-and-artifact-plan.md` §6 selects `@react-pdf/renderer` for PDF rendering.
- H2O v3 references define the four-PDF package and brand primitives.
- Older `/Users/ricardoaltamirano/Developer/SecondStream` project demonstrates typed PDF tools generating/uploading PDF attachments.

## Review Workload Forecast

| Field                   | Value                                                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Current state           | PR1/PR2 foundation applied but Markdown-first expectations need correction                                                 |
| Remaining changed lines | High; PDF renderers should be split                                                                                        |
| Chained PRs recommended | Yes                                                                                                                        |
| Suggested split         | PR3A Field Brief PDF foundation → PR3B package/trigger contract → PR4 Playbook PDF → PR5 Analytical PDF → PR6 Proposal PDF |
| 400-line budget risk    | High                                                                                                                       |

## Already Completed Foundation

- [x] Lambda-safe filesystem Agent Skills.
- [x] Artifact table/store and owner/thread/kind payload persistence.
- [x] request-scoped artifact tool context.
- [x] four artifact tool schemas.
- [x] authenticated route skeleton.
- [x] Lambda Artifact store env/IAM and AppSync owner/timestamp compatibility.

## Corrective PR3A — PDF Renderer Foundation and Field Brief PDF

**Goal:** Introduce `@react-pdf/renderer`, port minimum H2O brand primitives, make Field Brief tool/route return a real PDF.

### 3A.1 RED — Add PDF route/tool expectations

- Update tests so `field-brief/pdf` no longer expects `501`.
- Add tests asserting:
  - route returns `application/pdf`,
  - `Content-Disposition` filename ends in `.pdf`,
  - PDF response starts with `%PDF` or route uses a valid stream from renderer,
  - Field Brief tool result includes `format: "pdf"`, `mediaType: "application/pdf"`, and no Markdown-only assumption.

### 3A.2 GREEN — Install and isolate `@react-pdf/renderer`

- Add dependency selected in `docs/agent-audit-and-artifact-plan.md` §6.
- Keep imports isolated under `src/lib/artifacts/pdf/*` so tool and route code depend on renderer seams.

### 3A.3 GREEN — Port brand tokens and shared primitives

- Add:
  - `src/lib/artifacts/pdf/brand-tokens.ts`
  - `src/lib/artifacts/pdf/shared-document.tsx`
- Port conceptually from `H2O Allegiant Discovery Agent v3/h2o-allegiant-brand-brand.py`:
  - colors,
  - page constants,
  - typography defaults,
  - `LogoMark`/fallback,
  - `PageFooter`,
  - `CoverBlock`,
  - `StageBadge`,
  - `InsightBox`,
  - `SectionHeader`.

### 3A.4 GREEN — Implement Field Brief document

- Add `src/lib/artifacts/pdf/field-brief-document.tsx` and renderer function.
- Include:
  - cover/header block,
  - stage badge,
  - flags/stop header support,
  - four fixed sections,
  - insight boxes,
  - recommended approach,
  - cost-of-alternative table,
  - kill-risk cards,
  - action cards,
  - footer/page treatment.

### 3A.5 GREEN — Wire Field Brief PDF route

- Update `app/api/threads/[threadId]/artifacts/[kind]/[format]/route.ts`:
  - for `kind=field-brief&format=pdf`, render real PDF,
  - keep unsupported PDFs unavailable only for artifact kinds not yet implemented if slicing requires it.

### 3A.6 GREEN — Update Field Brief tool result

- Update `src/ai/tools/h2o-artifacts.ts`:
  - `generateFieldBrief` returns PDF format.
  - Do not claim Markdown as the primary output.
  - If Markdown route remains, make it secondary/optional only.

### 3A.7 TRIANGULATE — Prairie structural visual gate

- Use v3 reference fixture to assert Field Brief structure exists.
- Manual/visual comparison may be recorded in `apply-progress.md`.

## PR3B — Four-PDF Package Contract and Trigger Correction

**Goal:** Correct trigger/tool result behavior from Field-Brief-only/Markdown-first to four-PDF package guidance.

### 3B.1 RED — Update trigger tests

- Attachment/opportunity turn should request all four artifact generations, Field Brief first.
- Conversational turn should still request none.

### 3B.2 GREEN — Update trigger reminder

- Update `src/lib/artifacts/artifact-trigger.ts` and chat handler tests.
- Reminder must be server-authored/sanitized.

### 3B.3 GREEN — Update tool result contracts

- All artifact tools should eventually advertise PDF format only when implemented.
- While PR4-PR6 are pending, avoid returning fake PDF URLs for unimplemented document renderers.
- If user requires all four PDFs in one release, keep branch unmerged until PR4-PR6 are complete.

## PR4 — Playbook PDF

- Add Playbook PDF primitives:
  - `PlaybookCover`
  - `ThemeHeader`
  - `WhyItMattersCallout`
  - `QuestionList`
- Add `PlaybookDocument` and renderer.
- Route returns Playbook PDF.
- `generatePlaybook` returns PDF format.
- Tests assert PDF route/tool behavior.

## PR5 — Analytical Read PDF

- Add Analytical Read primitives:
  - `AnalyticalCover`
  - `EvidenceTaggedParagraph`
  - `DecisionMakerMatrix`
  - `SubStreamSection`
  - `FundingPathwayBlock`
- Add `AnalyticalReadDocument` and renderer.
- Route returns Analytical Read PDF.
- `generateAnalyticalRead` returns PDF format.
- Tests assert PDF route/tool behavior.

## PR6 — Proposal Shell PDF

- Add Proposal Shell primitives:
  - `FormalCover`
  - `ScopeBlock`
  - `CommitBoundaryBlock`
  - `RiskAllocationBlock`
- Add `ProposalShellDocument` and renderer.
- Route returns Proposal Shell PDF.
- `generateProposalShell` returns PDF format.
- Add visual/product sign-off note because Proposal Shell is customer-facing.

## Tests and Verification Commands

Run per slice:

```text
bun run test <new/changed test files>
bun run test
bunx tsc --noEmit
bun run check
bun run verify:amplify-config
```

Run sandbox after package/backend changes:

```text
nvm use && npx ampx sandbox
```

## Acceptance Gates

- No artifact tool should return a fake PDF URL.
- No route should return PDF `501` for an artifact kind declared implemented.
- PDFs should be rendered from typed payloads, not Markdown conversion.
- Markdown-only expectations in tests must be removed or demoted to optional mirror behavior.
- Field Brief visual structure must match H2O v3 reference intent before moving to follow-ons.

## Rollback

- If `@react-pdf/renderer` fails in the deployment target, keep typed payload/store/tools and replace only the renderer boundary with another TS-compatible PDF renderer or an explicit rendering service.
- Do not roll back to Markdown-primary output; that is not the product contract.
