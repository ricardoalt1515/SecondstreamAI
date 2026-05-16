# Apply Progress: add-h2o-downloadable-artifacts

## Workload / PR Boundary

- Applied slices:
  - **PR1 — Lambda-safe Agent Skills, JSON-only artifact infrastructure, authenticated Markdown download route**.
  - **PR2 — artifact tool schemas/factories, full Markdown renderers, request-scoped chat wiring, and trigger policy**.
  - **PR3A — corrective PDF-first Field Brief renderer, authenticated PDF route, and Field Brief PDF tool URL**.
  - **PR3 four-PDF completion — Playbook, Analytical Read, and Proposal Shell PDF renderers; tool returns PDF-first for all four kinds; capability caveat updated.**
  - **v3 migration — agent skills consolidated 9 → 5 from `H2O Allegiant Discovery Agent v3/H2O Allegiant Skills/`; system prompt swapped to v3 `h2o-allegiant-system-prompt-v3.md`.**
  - **Markdown-mirror removal — deleted `markdown-renderers.ts` and its tests; route only serves `format=pdf`; tool returns PDF-only formats; prompt caveat declares PDFs-only.**
  - **Chat Lambda runtime fixes — timeout bumped to 5 minutes and memory to 1024 MB; trigger reminder rewritten to fire the four-PDF package on attachment / trigger phrase, and to declare fast-path otherwise.**
  - **Browser Lambda URL fix — `src/components/chat-interface.tsx` no longer points at a stale Function URL; updated to the active sandbox URL.**
  - **Bedrock multi-system fix — server-authored trigger reminder is now injected as a `role: "user"` message containing `<system-reminder>` (was `role: "system"` and broke Bedrock Converse).**
- Delivery strategy: `auto-chain`, `stacked-to-main`. Treat the rollout as one "four-PDF completion" PR rather than the original tiny corrective.
- 400-line budget risk: High for the full change; PR1 and PR2 were kept isolated; PR3 + v3 migration + markdown removal landed together after explicit user direction to "procede con lo que falta".

## Completed Tasks

- [x] Hardened filesystem `loadSkill` with conservative skill-name validation and preserved `SKILL.md` source-of-truth loading.
- [x] Added CDK `NodejsFunction` command hooks to copy `src/ai/skills` into the `chat-streaming` Lambda bundle.
- [x] Removed unused `src/ai/prompts/water-sector.md` and `src/ai/prompts/water-sector.ts` after confirming no code imports remained.
- [x] Added JSON-only `Artifact` Amplify model fields for owner/thread/kind/status/title/customerSlug/payloadVersion/payload/timestamps.
- [x] Fixed post-review blocker by storing `kind` as a GraphQL-safe string with app-level validation instead of hyphenated GraphQL enum values.
- [x] Fixed post-review blocker by preventing failed artifacts from being returned as active/downloadable artifacts.
- [x] Added artifact store seam, in-memory test implementation, and Amplify implementation.
- [x] Added artifact kind helpers and deterministic Markdown renderer seam.
- [x] Added authenticated on-demand route `GET /api/threads/[threadId]/artifacts/[kind]/[format]`.
- [x] Implemented PR1 route behavior: `md` renders Markdown with attachment headers; `pdf` returns `501 ARTIFACT_FORMAT_UNAVAILABLE`.
- [x] Added strict Zod schemas and request-scoped tools for `generateFieldBrief`, `generatePlaybook`, `generateAnalyticalRead`, and `generateProposalShell`.
- [x] Completed deterministic Markdown renderer coverage for Field Brief, Playbook, Analytical Read, and Proposal Shell.
- [x] Refactored the agent to `createAgent({ tools })` while preserving `loadSkill`.
- [x] Wired artifact tools into Next and Lambda chat handlers with owner/thread request context.
- [x] Added Lambda DynamoDB artifact store and chat-streaming Artifact table env/IAM wiring.
- [x] Added server-authored Field Brief trigger reminders for attachment/trigger-phrase turns.
- [x] Updated H2O prompt capability caveat: Markdown artifact downloads are available; PDFs are not.
- [x] Installed `@react-pdf/renderer` and added a server-only PDF renderer boundary under `src/lib/artifacts/pdf/`.
- [x] Ported H2O Field Brief brand/layout primitives conceptually into TypeScript React-PDF components.
- [x] Replaced `field-brief/pdf` route `501` behavior with real `application/pdf` rendering and attachment headers.
- [x] Added Playbook, Analytical Read, and Proposal Shell PDF documents under `src/lib/artifacts/pdf/` with cycling theme accent palette (Playbook), dynamic Object.keys-based table (Analytical Read), and two-column commit grid (Proposal Shell).
- [x] Switched the route to a `switch(artifact.kind)` over the four PDF renderers; non-matching kinds still return `501 ARTIFACT_FORMAT_UNAVAILABLE`.
- [x] Updated all four artifact tools to return PDF-first formats; tool descriptions reflect "Returns a real PDF download URL".
- [x] Migrated agent skills to v3 (`h2o-allegiant-brand`, `h2o-evidence-and-context`, `h2o-field-brief`, `h2o-positioning`, `h2o-stage-and-gaps`); deleted the nine v2 skills.
- [x] Swapped system prompt to v3 (`H2O Allegiant Discovery Agent v3/h2o-allegiant-system-prompt-v3.md`); regenerated `.ts` via `jq -Rs`.
- [x] Removed Markdown mirrors end-to-end: deleted `markdown-renderers.ts` plus tests, narrowed `ArtifactFormat` to `pdf` only, route rejects `format=md` with `400 ARTIFACT_ROUTE_INVALID`, prompt caveat declares PDFs-only.
- [x] Relocated payload types and slug helper to `src/lib/artifacts/payloads.ts` (`pdfFilename` helper, four payload types).
- [x] Fixed browser Lambda URL drift in `src/components/chat-interface.tsx` (was pointing at a stale Function URL from a previous sandbox).
- [x] Fixed Bedrock "multiple system messages" runtime error by changing the server-authored trigger reminder injection from `role: "system"` to `role: "user"` with the `<system-reminder>` tag inside the message body.
- [x] Sanitized `x-error-detail` response header in `amplify/functions/chat-streaming/handler.ts` via `toHeaderSafe()` to strip non-ASCII characters (em-dash from the v3 prompt was breaking `undici` ByteString encoding).
- [x] Bumped chat-streaming Lambda timeout to `Duration.minutes(5)` and memory to `1024 MB` to accommodate the four-tool sequence (loadSkill + four generate* round-trips).
- [x] Rewrote the trigger reminder to align with v3: on attachment / trigger phrase, request the four-artefact package in order; on no trigger, declare fast-path conversational.

## Files Changed

- `amplify/backend.ts`
- `amplify/backend.test.ts`
- `amplify/data/resource.ts`
- `amplify/data/resource.test.ts`
- `app/api/threads/[threadId]/artifacts/[kind]/[format]/route.ts`
- `app/api/threads/[threadId]/artifacts/[kind]/[format]/route.test.ts`
- `src/lib/artifacts/pdf/brand-tokens.ts`
- `src/lib/artifacts/pdf/shared-document.tsx`
- `src/lib/artifacts/pdf/field-brief-document.tsx`
- `src/lib/artifacts/pdf/field-brief-document.test.ts`
- `src/ai/tools/load-skill.ts`
- `src/ai/tools/load-skill.test.ts`
- `src/ai/prompts/water-sector.md` (deleted)
- `src/ai/prompts/water-sector.ts` (deleted)
- `src/lib/artifacts/artifact-store.ts`
- `src/lib/artifacts/artifact-store.test.ts`
- `src/lib/artifacts/amplify-artifact-store.ts`
- `src/lib/artifacts/amplify-artifact-store.test.ts`
- `src/lib/artifacts/markdown-renderers.ts`
- `src/lib/artifacts/markdown-renderers.test.ts`
- `src/lib/artifacts/markdown-renderers.pr2.test.ts`
- `src/lib/artifacts/artifact-trigger.ts`
- `src/lib/artifacts/artifact-trigger.test.ts`
- `src/lib/artifacts/lambda-artifact-store.ts`
- `src/lib/artifacts/lambda-artifact-store.test.ts`
- `src/ai/tools/h2o-artifacts.ts`
- `src/ai/tools/h2o-artifacts.test.ts`
- `src/ai/agents/agent.ts`
- `src/ai/agents/agent.test.ts`
- `src/lib/chat-handler.ts`
- `src/lib/chat-handler.artifacts.test.ts`
- `src/lib/chat-handler-next.ts`
- `amplify/functions/chat-streaming/handler.ts`
- `amplify/functions/chat-streaming/handler.test.ts`
- `src/ai/prompts/h2o-allegiant.md`
- `src/ai/prompts/h2o-allegiant.ts`

## TDD Cycle Evidence

| Task                       | Test File                                                                                                                                                        | Layer                 | Safety Net                                 | RED                                                        | GREEN                                                     | TRIANGULATE                                                                                         | REFACTOR                                                           |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------ | ---------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1.1/1.2 `loadSkill` safety | `src/ai/tools/load-skill.test.ts`                                                                                                                                | Unit                  | Existing file covered by focused RED run   | ✅ Unsafe traversal tests failed against old loader        | ✅ 5/5 passed after validation                            | ✅ Real H2O skill + traversal + separator cases                                                     | ✅ Focused tests re-run after formatting                           |
| 1.3 Lambda bundle copy     | `amplify/backend.test.ts`                                                                                                                                        | Unit/config           | Existing backend tests included in RED run | ✅ Command hook assertion failed before implementation     | ✅ 2/2 passed after CDK hook                              | ✅ Asserted actual command output from hook                                                         | ✅ Focused tests re-run after formatting                           |
| 1.5 Artifact model         | `amplify/data/resource.test.ts`                                                                                                                                  | Unit/config           | N/A new test                               | ✅ Model-shape test failed before `Artifact` existed       | ✅ 1/1 passed after schema update                         | ✅ Post-review fix changed `kind` to GraphQL-safe string with app validation                        | ✅ Focused tests re-run after blocker fix                          |
| 1.6 Artifact store         | `src/lib/artifacts/artifact-store.test.ts`, `src/lib/artifacts/amplify-artifact-store.test.ts`                                                                   | Unit                  | N/A new tests                              | ✅ Missing module failed before implementation             | ✅ Store tests passed after implementations               | ✅ Owner isolation, replacement, invalid kind, failed-not-active, Amplify update/create paths       | ✅ Focused tests re-run after blocker fix                          |
| 1.7 Markdown renderer      | `src/lib/artifacts/markdown-renderers.test.ts`                                                                                                                   | Unit                  | N/A new test                               | ✅ Missing module failed before implementation             | ✅ 3/3 passed after renderer                              | ✅ Structured payload, generic payload, filename cases                                              | ✅ Focused tests re-run after formatting                           |
| 1.8/1.9 Download route     | `app/api/threads/[threadId]/artifacts/[kind]/[format]/route.test.ts`                                                                                             | Unit/route            | N/A new test                               | ✅ Missing route module failed before implementation       | ✅ Route tests passed after route                         | ✅ 401, 400, wrong owner, missing artifact, failed artifact 404, md success, pdf 501                | ✅ Focused tests re-run after blocker fix                          |
| 2.1 Tool schemas           | `src/ai/tools/h2o-artifacts.test.ts`                                                                                                                             | Unit                  | N/A new tests                              | ✅ Missing `h2o-artifacts` module failed first             | ✅ 3/3 schema/tool tests passed                           | ✅ Valid all four schemas; invalid stage/actions/themes rejected                                    | ✅ Re-run after formatting/type fixes                              |
| 2.2 Tool factories         | `src/ai/tools/h2o-artifacts.test.ts`                                                                                                                             | Unit                  | Store seam from PR1                        | ✅ Missing tool factory failed first                       | ✅ Tool persists payload via request owner/thread context | ✅ Result includes Markdown URL only and no PDF format                                              | ✅ Re-run after formatting/type fixes                              |
| 2.3 Markdown renderers     | `src/lib/artifacts/markdown-renderers.pr2.test.ts`, `src/lib/artifacts/markdown-renderers.test.ts`                                                               | Unit                  | PR1 generic renderer tests                 | ✅ Missing artifact-specific renderer exports failed first | ✅ 7 renderer tests passed                                | ✅ Field Brief table/risks/actions, Playbook questions, Analytical tags/table, Proposal scope       | ✅ Dispatcher fallback fixed for legacy payload shapes             |
| 2.4 Agent/chat wiring      | `src/ai/agents/agent.test.ts`, `src/lib/chat-handler.artifacts.test.ts`, `amplify/functions/chat-streaming/handler.test.ts`                                      | Unit/integration seam | Existing chat handler tests                | ✅ Missing `createAgent`/wiring failed first               | ✅ Agent factory/chat wiring tests passed                 | ✅ Preserves `loadSkill`, injects artifact tools with owner/thread, Lambda composes artifact store  | ✅ Existing chat tests re-run                                      |
| 2.5 Trigger policy         | `src/lib/artifacts/artifact-trigger.test.ts`, `src/lib/chat-handler.artifacts.test.ts`                                                                           | Unit/integration seam | N/A new tests                              | ✅ Missing trigger module failed first                     | ✅ Trigger tests passed                                   | ✅ Attachment, trigger phrase, and non-trigger states covered                                       | ✅ Reminder is server-authored and only added when tools are wired |
| 2.x Lambda artifact store  | `src/lib/artifacts/lambda-artifact-store.test.ts`, `amplify/backend.test.ts`                                                                                     | Unit/config           | PR1 Amplify store tests                    | ✅ Missing Lambda artifact store failed first              | ✅ Lambda store/backend tests passed                      | ✅ Deterministic active key, AppSync owner encoding, and ready-only load behavior                   | ✅ Re-run after review blocker fix                                 |
| 3A Field Brief PDF         | `src/lib/artifacts/pdf/field-brief-document.test.ts`, `app/api/threads/[threadId]/artifacts/[kind]/[format]/route.test.ts`, `src/ai/tools/h2o-artifacts.test.ts` | Unit/route            | PR1/PR2 Markdown route/tool tests          | ✅ Existing tests asserted PDF unavailable / Markdown-only | ✅ PDF renderer, route, and tool tests passed             | ✅ PDF magic bytes, attachment headers, Field Brief PDF URL, and non-Field PDF 501 behavior covered | ✅ Re-run after Biome formatting                                   |

## Test Commands Run

- RED: `bun run test src/ai/tools/load-skill.test.ts amplify/backend.test.ts amplify/data/resource.test.ts src/lib/artifacts/artifact-store.test.ts src/lib/artifacts/markdown-renderers.test.ts 'app/api/threads/[threadId]/artifacts/[kind]/[format]/route.test.ts'` — failed as expected before implementation.
- GREEN: `bun run test src/ai/tools/load-skill.test.ts amplify/backend.test.ts amplify/data/resource.test.ts src/lib/artifacts/artifact-store.test.ts src/lib/artifacts/amplify-artifact-store.test.ts src/lib/artifacts/markdown-renderers.test.ts 'app/api/threads/[threadId]/artifacts/[kind]/[format]/route.test.ts'` — 7 files / 23 tests passed.
- Typecheck: `bunx tsc --noEmit` — passed.
- Full test suite: `bun run test` — 36 files / 163 tests passed.
- Lint/check first pass: `bun run check` — failed on formatting/import ordering in new files.
- Refactor formatting: `bunx biome check --write <changed files>` — fixed formatting/import ordering.
- Post-refactor focused verification + typecheck + check: focused tests passed; `bunx tsc --noEmit` passed; `bun run check` passed.
- Final full suite after initial apply: `bun run test` — 36 files / 163 tests passed.
- Post-review blocker focused run: `bun run test amplify/data/resource.test.ts src/lib/artifacts/artifact-store.test.ts src/lib/artifacts/amplify-artifact-store.test.ts 'app/api/threads/[threadId]/artifacts/[kind]/[format]/route.test.ts'` — 4 files / 18 tests passed.
- Post-review full suite: `bun run test` — 36 files / 168 tests passed.
- Post-review typecheck: `bunx tsc --noEmit` — passed.
- Post-review check: `bun run check` — passed.
- Amplify config smoke: `bun run verify:amplify-config` — passed; outputs include Auth, Data, and Storage sections.
- Amplify sandbox: `nvm use && npx ampx sandbox` — passed. Evidence from user run: Node v22.22.2, backend synthesized in 2.03s, type checks completed in 0.38s, assets built/published, deployment completed in 210.163s, AppSync endpoint emitted, and `amplify_outputs.json` written.
- PR2 RED focused runs:
  - `bun run test src/ai/tools/h2o-artifacts.test.ts src/lib/artifacts/markdown-renderers.pr2.test.ts src/lib/artifacts/artifact-trigger.test.ts` — failed as expected before modules/exports existed.
  - `bun run test src/ai/agents/agent.test.ts src/lib/chat-handler.artifacts.test.ts` — failed as expected before agent factory/chat wiring.
  - `bun run test src/lib/artifacts/lambda-artifact-store.test.ts` — failed as expected before Lambda artifact store existed.
- PR2 GREEN focused runs:
  - `bun run test src/ai/tools/h2o-artifacts.test.ts src/lib/artifacts/artifact-trigger.test.ts` — 2 files / 6 tests passed.
  - `bun run test src/lib/artifacts/markdown-renderers.test.ts src/lib/artifacts/markdown-renderers.pr2.test.ts` — 2 files / 7 tests passed.
  - `bun run test src/ai/agents/agent.test.ts src/lib/chat-handler.artifacts.test.ts` — 2 files / 2 tests passed.
  - `bun run test amplify/functions/chat-streaming/handler.test.ts amplify/backend.test.ts src/lib/artifacts/lambda-artifact-store.test.ts` — 3 files / 8 tests passed.
  - PR2 combined focused run over tools/renderers/trigger/agent/chat/Lambda/backend plus existing chat/API tests — 11 files / 31 tests passed.
- PR2 typecheck: `bunx tsc --noEmit` — passed.
- PR2 full suite: `bun run test` — 42 files / 182 tests passed.
- PR2 check: `bun run check` — passed.
- PR2 Amplify config smoke: `bun run verify:amplify-config` — passed; outputs include Auth, Data, and Storage sections.
- PR2 first post-review blocker focused run: `bun run test src/lib/artifacts/lambda-artifact-store.test.ts src/ai/tools/h2o-artifacts.test.ts src/lib/chat-handler.artifacts.test.ts` — 3 files / 6 tests passed.
- PR2 first post-review full suite: `bun run test` — 42 files / 182 tests passed.
- PR2 first post-review typecheck: `bunx tsc --noEmit` — passed.
- PR2 first post-review check: `bun run check` — passed.
- PR2 first post-review Amplify config smoke: `bun run verify:amplify-config` — passed.
- PR2 second post-review blocker focused run: `bun run test src/lib/artifacts/lambda-artifact-store.test.ts` — 1 file / 2 tests passed.
- PR2 second post-review typecheck/check: `bunx tsc --noEmit && bun run check` — passed.
- PR2 second post-review full suite: `bun run test` — 42 files / 182 tests passed.
- PR3A focused renderer/route/tool tests: `bun run test src/lib/artifacts/pdf/field-brief-document.test.ts 'app/api/threads/[threadId]/artifacts/[kind]/[format]/route.test.ts' src/ai/tools/h2o-artifacts.test.ts` — 3 files / 13 tests passed.
- PR3A typecheck: `bunx tsc --noEmit` — passed.
- PR3A full suite: `bun run test` — 43 files / 185 tests passed.
- PR3A check: `bun run check` — passed after Biome formatting.
- PR3A Amplify config smoke: `bun run verify:amplify-config` — passed; outputs include Auth, Data, and Storage sections.
- PR3A Amplify sandbox attempt: `nvm use && npx ampx sandbox` could not run in this shell because `nvm` is unavailable (`nvm: command not found`); command was not rerun with Node 26 to avoid violating the Node LTS instruction.

## Deviations from Design

- PR1 route verifies thread ownership via injected/production chat store lookup and returns owner-safe `404` for missing/wrong-owner thread or artifact.
- `ArtifactStore` replacement semantics update the existing active row in the Amplify implementation rather than creating version history. This matches PR1 active-payload semantics and avoids stale active targets.
- PR1/PR2 PDF routes returned `501` with `x-error-code: ARTIFACT_FORMAT_UNAVAILABLE`; PR3A replaces this for Field Brief only while leaving other artifact PDFs unavailable.
- `Artifact.kind` uses `a.string().required()` rather than `a.enum([...hyphenated])` because GraphQL enum values cannot contain hyphens; app-level `ArtifactKind` validation preserves the external route/tool values.
- Failed artifact attempts are stored for auditability but are not returned by active lookups or downloadable routes.
- PR2 adds a direct DynamoDB `LambdaDynamoDbArtifactStore` for chat-streaming artifact writes instead of using the Next/Amplify server-cookie store in Lambda.
- `LambdaDynamoDbArtifactStore` writes the Amplify owner field using AppSync owner encoding (`${userId}::${userId}`) so Lambda-created artifacts remain readable through authenticated owner-based AppSync/Next download paths.
- `LambdaDynamoDbArtifactStore` also writes Amplify model `createdAt`/`updatedAt` fields alongside custom `createdAtIso`/`updatedAtIso` to match direct DynamoDB write compatibility used by Lambda chat-store rows.
- PR2 tool results intentionally returned Markdown-only `formats`; PR3A updates Field Brief only to return a PDF-first `formats` array plus Markdown mirror.
- Server-authored artifact trigger reminders are transient model context only; they are not persisted as chat messages.
- **Markdown mirrors removed entirely** after the v3 migration. Original SDD (and engram #4555 "V1 includes all 4 artifacts… Each with PDF + markdown export") prescribed PDF + Markdown for every artifact. v3 design intent is PDF-only ("Do not produce markdown mirrors of any artefact"). The Markdown plumbing was deleted to remove a contradiction surface between the prompt and the tool output. Trade-off explicitly accepted: lose textual-inspection convenience during debug in exchange for prompt/tool coherence. If textual debug becomes necessary, reintroduce as an internal-only inspection helper (NOT a tool result format).
- **Server-authored trigger reminder is injected as a `role: "user"` message** with the `<system-reminder>` tag inside the message body, NOT as a `role: "system"` message. Bedrock Converse API rejects multiple system messages separated by user/assistant messages with `AI_UnsupportedFunctionalityError`. This is the standard Claude pattern for transient reminders.
- **Chat Function URL is hardcoded in `src/components/chat-interface.tsx`** for the time being. Sandbox redeploys can rotate this URL and the hardcoded value will drift. Follow-up: expose the URL via `amplify_outputs.json` custom output and read it at client init.
- Chat-streaming Lambda configured for the four-tool sequence: `memorySize: 1024`, `timeout: Duration.minutes(5)`, `InvokeMode.RESPONSE_STREAM` (already set). Sonnet 4.6 with 4-6 Bedrock round-trips per opportunity-advancing turn exceeds 60s on cold + warm starts.

## Remaining Tasks

- Move the chat Function URL out of source (`src/components/chat-interface.tsx:49`) and into `amplify_outputs.json` via a CDK custom output, so sandbox redeploys do not break the client.
- Optional: consider an internal-only Markdown debug inspector (NOT a tool result format) if textual-inspection convenience proves necessary during development.

## PDF-First Pivot Note

After PR2, the user clarified that the intended artifact deliverables are four real PDFs, not Markdown-primary downloads. The SDD proposal/spec/design/tasks were corrected to PDF-first based on `H2O Allegiant Discovery Agent v3/` references, the older SecondStream PDF tool precedent, and `docs/agent-audit-and-artifact-plan.md` §6 selecting `@react-pdf/renderer`.

Current PR1/PR2 code remains useful foundation for skills, typed payloads, owner/thread scoping, tools, and routes, but Markdown-only tool/result assumptions are now considered transitional and must be corrected before final V1 acceptance.

## Risks / Notes

- Amplify sandbox deployment succeeded after PR1 apply, validating Gen 2 cloud synthesis/deploy for the `Artifact` model and backend changes.
- The CDK command hook is unit-tested for configuration and command output. Sandbox asset build/publish succeeded, but a direct zip/asset inspection for `src/ai/skills/*/SKILL.md` inside the Lambda bundle has not been separately recorded.
- Amplify emitted an owner-reassignment warning for multiple owner-authorized models, including `Artifact`. This is consistent with existing owner-auth model warnings but should be revisited if field-level authorization becomes necessary.
- PR2 added backend env/IAM for the Artifact table in the chat-streaming Lambda. Local tests/config pass, but `nvm use && npx ampx sandbox` was not re-run after PR2.
- PDF-first correction is now implemented for Field Brief only: `@react-pdf/renderer` is installed, TS PDF brand primitives/documents exist, the Field Brief tool advertises a real PDF URL, and `field-brief/pdf` returns `application/pdf`.
- Playbook, Analytical Read, and Proposal Shell PDFs are intentionally deferred to keep PR3A reviewable and avoid unapproved scope expansion.
