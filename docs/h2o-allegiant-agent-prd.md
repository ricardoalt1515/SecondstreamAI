# PRD — H2O Allegiant Discovery Agent (in-product)

**Owner:** Ricardo Altamirano
**Status:** Draft for team review
**Last updated:** 2026-05-14
**Related docs:** `docs/agent-audit-and-artifact-plan.md` (technical plan), `H2O Allegiant Discovery Agent v2/` (product spec source of truth)

---

## Problem Statement

US wastewater BD field agents walk into customer conversations under-prepared. They have a case file, maybe an NPDES permit, maybe a call recap — but no defended position framed on the customer's economics. They lose deals to whichever vendor currently looks like the cheapest line item, because they cannot show the customer what their alternative actually costs over five years (ongoing surcharges, future regulatory retrofits, enforcement exposure, safety risk).

Today, the prep work that would produce that defended position lives in spreadsheets, scattered Word docs, and the head of whichever senior consultant happens to be available. Field agents in early-career stages do not have access to that knowledge. Senior consultants spend hours hand-building briefs that should be standardized.

The result: inconsistent conversations, missed reframes, and deals lost on customer-side economics that were never quantified.

We have a comprehensive product spec (`H2O Allegiant Discovery Agent v2/`) describing a Claude-based intelligence layer that solves this problem when run inside a Claude Project. The spec is validated — there is a worked Prairie AeroSurface example produced through three feedback rounds. **The product works in concept. It now needs a production home.**

This PRD covers building that production home: integrating the H2O Allegiant Discovery Agent into our existing chat application so field agents access it through the same authenticated chat interface they already use, with proper data persistence, PDF generation, and team-scoped access.

---

## Solution

A chat-based interface for BD field agents. The agent runs an 8-skill operating sequence on every turn (segmentation → evidence interpretation → lens reads → flag inventory → gap analysis → deal staging → positioning → render). On opportunity-advancing turns it produces a **Field Brief** — a 1-2 page PDF (plus markdown mirror) with a defended position framed on the customer's economics, including a mandatory fully-priced cost-of-alternative table.

On explicit field-agent request, the agent also produces three follow-on artifacts:

- **Playbook** — 11-theme stage-aware question set, used as a reference tool during the customer call.
- **Analytical Read** — 4-8 page evidence-tagged write-up suitable for sending to a manager.
- **Proposal Shell** — 3-6 page scoping document for an RFP or formal proposal (the only customer-facing artifact).

The agent draws on a curated knowledge base (75-flag compliance taxonomy, 7 specialist solution lenses, 37 document-type reading disciplines) injected statically into its system prompt. All artifacts are persisted per thread, owner-scoped, and downloadable on demand.

Field agents access the agent through the existing authenticated chat application. Conversations, artifacts, and threads belong to the user via Cognito identity. Streaming runs through the existing Lambda Function URL chat infrastructure. PDF generation runs server-side in Next API routes using `@react-pdf/renderer`, rendering brand-kit primitives that match the validated Prairie reference example pixel-for-pixel.

The artifact panel surfaces alongside the chat. As the agent reasons, sections appear live in the panel. When the agent finishes, the artifact persists to DynamoDB. The user downloads PDF and markdown via dedicated endpoints. Re-rendering a brief overwrites the prior version — one of each artifact kind per thread maximum.

---

## User Stories

### Authentication & access

1. As a BD field agent, I want to log into the existing chat application with my Cognito credentials, so that I can use the H2O Allegiant agent without learning a new tool or managing a second account.
2. As a BD field agent, I want my threads and artifacts to be private to me by default (owner-scoped), so that customer-related work is not visible to teammates without explicit sharing.
3. As an unauthorized user, I want to be redirected to login when I try to access a thread, so that customer data is never exposed.

### Conversation & agent reasoning

4. As a BD field agent, I want to start a new thread by uploading a case file (PDF, image, or text), so that the agent can ingest evidence in the format my workflow produces.
5. As a BD field agent, I want to paste an NPDES permit excerpt, a call recap, or an RFI directly into the chat, so that I can give the agent context without converting files.
6. As a BD field agent, I want to see the agent's reasoning surface as a streaming response, so that I have feedback during the wait and can verify it understood my context.
7. As a BD field agent, I want the agent to show always-on stop-flags at the top of every response when present, so that I cannot miss a hazard or compliance trigger.
8. As a BD field agent, I want to ask focused questions ("what's the F006 exposure here?") and get a text answer without a new brief being generated, so that the panel does not churn when I just want a quick clarification.
9. As a BD field agent, I want to see the current deal stage (Lead / Qualify / Scope / Position / Propose / Close) in every agent response, so that I know where the conversation thinks the opportunity is.
10. As a BD field agent, I want the agent to acknowledge stage regression with a regression note, so that I understand when a deal has slipped backward and why.

### Field Brief artifact

11. As a BD field agent, I want a Field Brief produced automatically when I share opportunity-advancing context, so that I do not have to type "give me the brief" every time.
12. As a BD field agent, I want the Field Brief panel to appear alongside the chat as sections stream in, so that I can see the brief being built section by section.
13. As a BD field agent, I want the Field Brief to include the fixed four-section structure (What this is / What we'd propose / What could kill it / Do this next), so that every brief has the same shape and I read it the same way every time.
14. As a BD field agent, I want every Field Brief to include a cost-of-alternative table fully priced over 5 years, so that I can show the customer their economic exposure in their own books, not mine.
15. As a BD field agent, I want kill risks shown as severity-colored cards (red #1, amber #2/#3) with inline italic mitigation, so that I can quickly internalize what could collapse the deal.
16. As a BD field agent, I want each section to open with an insight box that surfaces the section's single key claim, so that I can skim the brief in 60 seconds before re-reading in 5.
17. As a BD field agent, I want a stage badge (color-coded by stage) on the cover block, so that the brief is self-describing when I share it.
18. As a BD field agent, I want a "Download PDF" button on the brief panel, so that I can save the brief locally or attach it to a calendar invite.
19. As a BD field agent, I want a "Download markdown" button on the brief panel, so that I can paste the content into Slack, email, or CRM without dealing with PDF.
20. As a BD field agent, I want the brief to re-render when I provide new evidence that shifts the stage or positioning, so that I always have the current version reflecting the latest context.
21. As a BD field agent, I want the brief to remain present in the panel when I open the thread later, so that my prep work is durable across sessions.

### Follow-on artifacts (on-demand)

22. As a BD field agent, I want to type "give me the playbook" (or similar) and receive a Playbook PDF + markdown with 11 themes of conversation questions stage-aware, so that I have a reference tool during the customer call.
23. As a BD field agent, I want to type "send to my manager" or "full write-up" and receive an Analytical Read (4-8 pages, evidence-tagged) PDF + markdown, so that I can escalate without rewriting the brief in long form.
24. As a BD field agent, I want to type "draft the proposal" when an RFP is on the table and receive a Proposal Shell PDF + markdown (3-6 pages) with explicit commit / don't-commit boundaries, so that the proposal team has a defensible starting point.
25. As a BD field agent, I want the follow-on artifacts to appear as additional tabs in the artifact panel alongside the Field Brief, so that I can switch between them without losing context.
26. As a BD field agent, I want each follow-on artifact to be downloadable as PDF and markdown via dedicated buttons, so that I can share them in whatever format the recipient prefers.
27. As a BD field agent, I want the agent to NOT produce follow-ons unless I explicitly ask, so that my panel stays focused on the Field Brief unless I need more.

### Visual & brand fidelity

28. As a BD lead reviewing briefs across the team, I want every brief to follow the validated Prairie visual rhythm (colors, layout, typography, primitives), so that the briefs feel like one product and not five different tools.
29. As a BD field agent, I want the H2O Allegiant logo and brand colors on every artifact, so that the artifact is identifiable when forwarded internally.
30. As a BD field agent, I want briefs to render at US Letter page size with the documented margins, so that they print and PDF-share consistently across devices.
31. As a BD field agent, I want page 2 of a Field Brief to have its own anchor header (small logo, customer name, stage, "continued"), so that page 2 has standalone identity if it gets separated from page 1.

### Trust, audit, and limits

32. As a BD field agent, I want the agent to use roles and categories (not specific names) for decision-makers, vendors, and funders, so that internal handover documents do not accidentally surface inappropriate specifics.
33. As a BD field agent, I want every sized number in the brief to carry a HIGH / MEDIUM / LOW confidence label, so that I know how much weight to put on it in conversation.
34. As a BD field agent, I want the agent to refuse to invent numbers when evidence is too thin, replacing with qualitative tags ("material exposure, uncapped") instead, so that I never walk into a conversation with a fabricated figure.
35. As a BD field agent, I want the agent to explicitly say "this is Assessment work, not Discovery" when I ask for things outside its scope (firm pricing, NPDES determinations, named vendors), so that I do not accidentally walk into Assessment territory.
36. As a BD field agent, I want artifacts to be marked "Internal handover" in their metadata line, so that I am reminded the Field Brief is never customer-facing (only the Proposal Shell is).

### Reliability and edge cases

37. As a BD field agent, I want a clear error message when the agent fails mid-stream, so that I know to retry rather than wonder whether the brief saved.
38. As a BD field agent, I want a partial brief NOT to overwrite my previous complete brief if the agent errors before completing all four sections, so that I do not lose prior good work.
39. As a BD field agent, I want the artifact panel to gracefully show "no brief yet" on a new thread instead of an empty rendered shell, so that I am not confused about whether something failed.
40. As a BD field agent, I want regenerating a message in chat to NOT silently rewrite the persisted artifact unless a new `propose*` tool call fires, so that regenerations stay scoped to the message they targeted.
41. As a BD field agent, I want the agent to handle threads where I provide context across multiple messages (case file Monday, NPDES Tuesday, call recap Wednesday), so that the brief accumulates context across the conversation rather than restarting each turn.

### Mobile and responsive

42. As a BD field agent on a phone reviewing a brief before a meeting, I want the artifact panel to render as a full-screen sheet on mobile, so that I can read the brief without horizontal scrolling.
43. As a BD field agent on a laptop, I want the artifact panel to render side-by-side with the chat (roughly 40/60 split), so that I can refine the brief in conversation while seeing it update.

---

## Implementation Decisions

### Architectural

- **Agent framework:** AI SDK v6 (`ToolLoopAgent`) running inside the existing Amazon Bedrock-backed chat Lambda Function URL. The Lambda was migrated to this pattern in the recent infrastructure work and is the production streaming path.
- **Model:** Anthropic Claude Sonnet 4.6 via Amazon Bedrock (`us.anthropic.claude-sonnet-4-6`). Prompt caching enabled where the Bedrock provider exposes it.
- **Streaming:** AI SDK v6 `createUIMessageStream` + `result.toUIMessageStream`. Custom data parts (`data-artifact-update`) emitted as transient (UI-only, not persisted in message history).
- **Authentication:** Cognito access token verified in Lambda via `aws-jwt-verify` (already in place). Next API routes use `@aws-amplify/adapter-nextjs` for Cognito SSR auth (already in place).
- **Persistence:** Hybrid pattern matching the existing chat storage decision. Schemas declared in Amplify Data (`a.model()`) for owner-scoped browser reads. Writes from Lambda go through `DynamoDBClient` direct (mirrors `lambda-chat-store.ts`), injecting Amplify-compatible metadata (`__typename`, `owner: "<sub>::<sub>"`).

### Knowledge base

- **Strategy:** Static injection into the system prompt. The system prompt v2 + 9 skill descriptions + ~7,800 lines of knowledge base files (75-flag taxonomy, 7-lens cheat sheet, 37-document-type catalogue) are concatenated at build time into a single string exported from a compiled module.
- **Caching:** The compiled prompt is the stable preamble of every request, letting Anthropic's prompt cache make per-turn cost negligible after the first thread interaction.
- **Why not RAG:** Sonnet 4.6's 200k token context easily accommodates the full KB. Introducing a vector store before evidence the simple path doesn't scale would be premature infrastructure.

### Unified artifact model

- One DynamoDB model `Artifact` with discriminator `kind` instead of four separate models. Composite identifier `(threadId, kind)`. Payload typed in TypeScript per `kind`. One artifact of each kind per thread maximum; re-rendering overwrites.
- TypeScript payload types: `FieldBriefPayload`, `PlaybookPayload`, `AnalyticalReadPayload`, `ProposalShellPayload`. Each type is shared between tool input schemas, DynamoDB serialization, React-PDF document props, markdown renderers, and UI panel components.

### Tool surface

- **Field Brief — 5 tools, streamed iteratively.** Cover + four sections. Each tool emits a `data-artifact-update` with a patch keyed by `kind: "field-brief"` and the section it covers. UI accumulates patches into the panel as the agent reasons.
- **Each follow-on — 1 tool, one-shot.** `proposePlaybook`, `proposeAnalyticalRead`, `proposeProposalShell`. Each takes a complete typed payload and emits one `data-artifact-update`. No iterative streaming — the agent composes them after positioning is committed.
- **No `isFinal` flag.** The agent terminates naturally when it stops calling tools. `stopWhen` uses the AI SDK default (`stepCountIs(20)`); revisit only if observed loops misbehave.

### Server-side accumulator

- The `onFinish` callback in `chat-handler.ts` walks `responseMessage.parts` after the stream completes. It groups tool calls by kind, builds the typed payload for each kind present, and upserts via a new `lambda-artifact-store` module. If no `propose*` tool calls fired, no artifact writes happen (conversational turn).
- Field Brief sections merge in order. Follow-ons are atomic. Partial Field Briefs (missing Section 4) are not persisted in V1 to avoid replacing good prior briefs with broken ones; revisit if users want resume-from-partial.

### PDF rendering

- **Library:** `@react-pdf/renderer`. Node-native, streamable via `renderToStream`, Helvetica built-in (matches brand spec primary font), Lambda-friendly bundle size.
- **Location:** Next API routes, NOT the chat Lambda. Reasoning: PDF generation is a non-streaming GET on-demand request. Bundling `@react-pdf/renderer` into the chat Lambda would inflate chat cold-start without benefit.
- **Brand primitives:** Port from `H2O Allegiant Discovery Agent v2/h2o-allegiant-brand-brand.py` (1,622 lines of ReportLab/Python). Approximately 20 React-PDF components total covering shared layout (logo, footer, page templates) and per-artifact primitives (cover blocks, stage badges, insight boxes, cost-of-alternative tables, kill-risk cards, action cards, theme headers for the Playbook, decision-maker matrix for the Analytical Read, commit-boundary blocks for the Proposal Shell).
- **Visual validation:** Before merging the Field Brief PR, the implementation must render the Prairie reference (`Reference/prairie_field_brief_v2.md` data) and produce output structurally indistinguishable from `Reference/prairie_field_brief_v2.pdf`. Sub-pixel typography variance is acceptable; structural differences are bugs.

### Markdown mirror

- Generated at request time from the typed payload. Never persisted. The DynamoDB payload is the single source of truth.
- Dedicated endpoint per artifact (separate from the PDF endpoint) returning `text/markdown` with `Content-Disposition: attachment`.

### API contracts

The agent exposes no new API beyond what the chat Lambda already provides. Two new Next API route patterns:

```
GET /api/threads/[threadId]/artifacts/[kind]/pdf
GET /api/threads/[threadId]/artifacts/[kind]/md

where [kind] ∈ field-brief | playbook | analytical-read | proposal-shell
```

Both require Cognito auth, read the `Artifact` row owner-scoped, render and stream the response.

### UI integration

- **Artifact panel component:** Single panel with tab navigation between artifact kinds present in the current thread. DOM components mirror the PDF structure but are implemented separately for in-browser viewing. Shared styling tokens (color palette, typography rules) come from a common source.
- **Layout:** Desktop two-column flex (chat ~40%, panel ~60%) when at least one artifact exists. Mobile `<Sheet>` triggered by an indicator. No panel on empty threads.
- **Hydration:** On thread mount, query `Artifact` filtered by `threadId` via Amplify Data with owner auth, hydrate all kinds found.
- **Live updates:** `useChat` `onData` callback dispatches `data-artifact-update` events into panel state — Field Brief patches merge, follow-ons replace whole.

### System prompt swap and supporting files

- Existing generic system prompt (`water-sector.md`) is replaced. The compiled string includes the H2O Allegiant v2 system prompt, all 9 skill descriptions, and the full knowledge base.
- Empty-state suggestions in the chat interface update to wastewater BD scenarios (case file intake, NPDES question, stage check).
- Logo PNG is bundled into the Next public directory so React-PDF can resolve it at render time.

### Out-of-scope cleanups bundled with PR1

- Remove the unused `loadSkill` tool and empty skills directory.
- Remove UI cases for tools that never existed (`tool-webSearch`, `tool-updateWorkingMemory`).
- Remove the `webSearchEnabled` request plumbing that the server has never consumed.
- Derive `MyUIMessage` from the agent definition via `InferAgentUIMessage` instead of declaring it by hand.

### Implementation order — 6 PRs

1. **PR1 (~150 LOC) — Cleanups.** Mechanical removal of dead code, type derivation fix.
2. **PR2 (~600 LOC) — Core foundation.** Unified `Artifact` model, system prompt + KB build pipeline, `lambda-artifact-store`, `onFinish` accumulator, shared brand tokens, endpoint scaffolding, `data-artifact-update` data part.
3. **PR3 (~900 LOC) — Field Brief end-to-end.** 5 tools, 9 PDF primitives, document component, markdown renderer, UI panel tab, hydration, Prairie visual validation gate.
4. **PR4 (~500 LOC) — Playbook end-to-end.** One tool, 4 PDF primitives, document, markdown, panel tab.
5. **PR5 (~600 LOC) — Analytical Read end-to-end.** One tool, 5 PDF primitives, document, markdown, panel tab.
6. **PR6 (~500 LOC) — Proposal Shell end-to-end.** One tool, 4 PDF primitives, document, markdown, panel tab.

Total approximately 3,250 LOC across 6 reviewable PRs. PR1-2 are foundation; PR3 gates everything downstream (validates the brand-kit port pattern); PR4-6 are repetitive applications of the proven pattern.

---

## Testing Decisions

### What makes a good test here

- **External behavior only.** Test the contract a module presents to its callers, not the internal mechanics. For tools, that means: given typed input, the writer emits the right shape of `data-artifact-update`. For renderers, that means: given a typed payload, the output PDF or markdown has the expected structural elements. Do not test private helpers or step-through internal logic.
- **Real serialization paths where they matter.** Tests for the DynamoDB writes use real `marshall`/`unmarshall` to catch undefined-handling bugs, mirroring the pattern in `lambda-chat-store.test.ts`.
- **Snapshot the markdown mirrors.** Markdown is deterministic from typed payload — snapshot tests catch accidental format drift on a regression-prone surface.
- **Do NOT snapshot PDFs.** PDF binary output is not deterministic across `@react-pdf/renderer` versions. Visual validation against Prairie is a manual gate, not an automated test.

### Modules covered by tests

| Module | Test focus | Prior art |
|---|---|---|
| `lambda-artifact-store` | Upsert by `(threadId, kind)`; metadata injection (`__typename`, `owner`); `marshall` with `removeUndefinedValues`; owner-scoped read | `src/lib/storage/lambda-chat-store.test.ts` |
| Tool inputs (`proposeFieldBrief*`, `proposePlaybook`, etc.) | Zod schema accepts valid payloads, rejects malformed ones; `execute` emits a `data-artifact-update` with correct shape and `transient: true` | New — first tools in the project; pattern follows AI SDK v6 examples |
| `onFinish` accumulator in `chat-handler` | Given a `responseMessage.parts` array containing tool calls, builds the right typed payload(s); no writes when no calls fired; correct grouping by kind | `src/lib/chat-handler.test.ts` |
| Markdown renderers (one per artifact kind) | Given a typed payload, produces a markdown string with the documented structure (H1, H2s, blockquotes for insights, tables for cost-of-alternative); snapshot tests | New — pattern would mirror what existing `chat-helpers.test.ts` does for deterministic string outputs |
| Next API routes for `pdf` and `md` | 401 without Cognito session; 404 for missing artifact; 403 when artifact belongs to another owner; correct `Content-Disposition` header; correct `Content-Type` | Existing route handler test patterns in the project (where present); otherwise integration-style via the `Request`/`Response` Web APIs |
| Artifact panel component | Renders Field Brief sections as data parts arrive; switches tabs when a new kind appears; hydrates from initial server-fetched data; degrades gracefully when no artifacts present | `src/components/chat-interface.test.tsx` |

### What is NOT tested in V1

- Visual fidelity of PDFs — handled by manual Prairie comparison gate.
- The Bedrock model itself — out of scope for this codebase.
- Prompt cache hit behavior — operationally monitored via Bedrock metrics, not unit tested.
- Knowledge base content correctness — owned by the H2O Allegiant content team, not engineering.

---

## Out of Scope

The following are explicitly out of scope for V1 and tracked as post-MVP work in `docs/agent-audit-and-artifact-plan.md`:

- **Inline editing of artifacts.** Users cannot edit the Field Brief or any follow-on in the panel. To revise, they continue the conversation and the agent re-renders.
- **Token-level streaming inside Field Brief sections.** Sections stream atomically (one tool call = one complete section). Token-by-token streaming inside a section is deferred until partial-markdown parser fragility is solved or proven unnecessary.
- **Custom font embedding.** The brand spec lists Inter, Inter Tight, and JetBrains Mono as registered-if-available secondary fonts. V1 uses Helvetica only (the brand spec primary). Custom fonts are deferred because Helvetica covers the spec and avoids embedding cold-start cost.
- **RAG or vector retrieval for the knowledge base.** V1 injects the full KB into the system prompt statically. RAG infrastructure is deferred until evidence that token cost or context-window limits demand it.
- **Multi-brief threads.** The spec defines an engagement boundary rule: separate Field Briefs only when both different decision-makers AND different procurement vehicles. The composite identifier `(threadId, kind)` enforces one of each kind per thread. Splitting one thread into multiple briefs is deferred.
- **On-demand follow-on partial streaming.** Follow-ons are emitted one-shot. If a user wants to see a Playbook build up live, that work is deferred.
- **Artifact versioning to S3.** Re-rendering overwrites. Historical versions are not retained. If audit-trail requirements emerge, snapshot-to-S3 is the post-MVP path.
- **Branched threads carrying over artifacts.** The existing thread branching feature does not copy artifacts to the new thread; new thread starts fresh.
- **Mobile-specific brief editing UX.** Mobile renders the panel as a `<Sheet>` for read-only viewing. Composing or refining via mobile is supported through the chat input, not panel-side controls.
- **Internationalization.** All artifacts render in English. The spec is US-focused (NPDES, ELG, CWSRF).
- **Tech debt tracked separately:** Lambda Function URL hardcoded in `chat-interface.tsx` (should become env var), unused `chat-handler-next.ts` in parallel to the Lambda handler, `streaming-canary` Lambda still deployed as diagnostic baseline. Cleanup outside this PRD.

---

## Further Notes

### Source of truth for product behavior

The agent's behavior — what it says, how it reasons, when it produces what artifact, what voice each artifact uses — is governed by the files in `H2O Allegiant Discovery Agent v2/`. The system prompt v2, the 9 SKILL files, and the knowledge base are the canonical specification. **Engineering does not redefine product behavior; we render the specification faithfully.** If a brief comes out wrong, the fix lives in the spec files, not in our codebase.

### Validated worked example

`H2O Allegiant Discovery Agent v2/Reference/prairie_field_brief_v2.pdf` is the canonical Field Brief — a Qualify-stage brief for Prairie AeroSurface Components, validated through three feedback rounds with the H2O Allegiant content team. Every future Field Brief should match its visual rhythm, section structure, voice, and insight-box phrasing. PR3's visual validation gate uses this as the diff target.

### Why we are not running the Python renderer

`H2O Allegiant Discovery Agent v2/Reference/render_field_brief.py` produces the Prairie example using ReportLab. We are not invoking it from the application. Reasons:

- Running Python in Lambda alongside Node adds a runtime, a deploy step, and cold-start cost.
- We would need to marshal the typed payload to Python, render, return bytes — adds latency and a serialization layer.
- React-PDF gives us components in the same language as the rest of the codebase, with the same package manager and the same deploy pipeline.

The Python renderer remains as a reference implementation for the visual port and as a fallback testing tool the content team can use independently.

### Migration coordination

The Lambda chat streaming migration completed during this planning cycle. The agent integration assumes the Lambda Function URL chat infrastructure as the production path. The unused `chat-handler-next.ts` and the canary Lambda are explicitly out of scope for this PRD but should be addressed in a follow-up cleanup so the team is not maintaining three parallel chat handlers indefinitely.

### Open questions to validate during execution

- Bedrock provider behavior with Anthropic prompt cache headers — confirm pass-through during PR2 implementation.
- `writer.write({ transient: true })` semantics inside the Lambda stream host — confirm before locking PR2 design.
- Amplify Data `a.json()` field with deeply nested payloads — confirm serialization round-trips cleanly per artifact kind.
- Compiled system prompt + KB token count — verify comfortably under the 200k context limit before committing to static injection at scale.

### Success criteria (V1 launch)

- A field agent can log in, upload a case file, and receive a Field Brief PDF + markdown within the same session.
- The Field Brief structurally matches the Prairie reference (cover, four sections, insight boxes, cost-of-alternative table, kill-risk cards, action cards, page-2 anchor when content earns it).
- The three follow-on artifacts are produced when requested by trigger phrases documented in the system prompt.
- Artifacts persist per thread and re-load on thread open.
- Owner-scoped auth prevents cross-user access via direct URL.
- Stop-flags surface as an always-on header when present, above the cover block.
- No artifact contains fabricated names, vendors, funders, or invented dollar figures absent from the evidence base or lens cheat-sheet.
