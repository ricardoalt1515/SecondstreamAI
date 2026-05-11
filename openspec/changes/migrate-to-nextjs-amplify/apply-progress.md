# Apply Progress: migrate-to-nextjs-amplify

## Mode

- Execution mode: Strict TDD active for latest fix batches (cached testing capabilities enable strict TDD with Vitest)
- Delivery: single PR with maintainer-approved `size:exception`
- Workload boundary: full migration batch in one PR, kept as coherent runtime migration slices

## Completed Tasks

- [x] 1.1 Verify Next.js streaming Response docs
- [x] 1.2 Verify Amplify Gen 2 defineAuth/defineData/defineStorage docs
- [x] 1.3 Verify AI SDK v6 streaming + Bedrock provider docs
- [x] 1.4 Install Next.js/Amplify deps; update package.json scripts
- [x] 1.5 Create next.config.ts; update tsconfig.json
- [x] 1.6 Scaffold amplify backend, auth, data, storage resources
- [x] 2.1 Create src/lib/auth/server.ts with getCurrentUser
- [x] 2.2 Replace hardcoded RESOURCE_ID with authenticated owner context in production handler/actions
- [x] 2.3 Add Amplify provider/configuration to the Next app shell
- [x] 3.1 Define Amplify Data models for User, AgentConfig, Session, Message, File, GeneratedOutput
- [x] 3.2 Implement AmplifyChatStore behind ChatStore interface
- [x] 3.3 Add owner authorization rules to Data models
- [x] 4.1 Implement AmplifyBlobStore behind BlobStore interface
- [x] 4.2 Configure private storage with the Gen 2-valid access rule `private/{entity_id}/*`; attachment keys remain nested under each owned root at `private/<identityId>/sessions/...`
- [x] 4.3 Default attachment flow to Amplify Storage, with S3 fallback only behind explicit `CHAT_BLOB_STORE_RUNTIME=s3`
- [x] 5.1 Create app/layout.tsx
- [x] 5.2 Create app/page.tsx
- [x] 5.3 Create app/c/[threadId]/page.tsx
- [x] 5.4 Create app/api/chat/route.ts streaming handler
- [x] 5.5 Convert src/server/*.ts to app/actions/*.ts
- [x] 6.1 Replace TanStack hooks with next/navigation in chat-interface.tsx
- [x] 6.2 Replace TanStack Link with next/link in app-sidebar.tsx
- [x] 6.3 Keep DefaultChatTransport pointed at `/api/chat`
- [x] 7.1 Create `src/lib/agents/registry.ts`
- [x] 7.2 Create Court Reporter agent config
- [x] 7.3 Wire registry into chat handler
- [x] 8.1 Unit tests for AmplifyChatStore and AmplifyBlobStore
- [x] 8.2 Route parity tests for app pages
- [x] 8.3 Chat stream integration test
- [x] 8.4 Auth ownership isolation test
- [x] 8.5 Attachment flow verification
- [x] 9.1 Delete src/routes/*, src/router.tsx, src/routeTree.gen.ts
- [x] 9.2 Delete vite.config.ts and TanStack Start deps
- [x] 9.4 Final lint and typecheck pass

## Deferred / Skipped

- [ ] 9.3 Remove custom S3 signing code: intentionally retained as opt-in fallback via `CHAT_BLOB_STORE_RUNTIME=s3` and still used by discovery report bundle storage until Amplify Storage smoke confirms generated artifact storage.

## Official / Local Sources Checked

- Next.js v16.2.2 docs via Context7: App Router Route Handlers can return streaming Web `Response`; POST route handlers use Web Request/Response.
- AI SDK docs via local `node_modules/ai/docs`: `createUIMessageStreamResponse`, `DefaultChatTransport`, `ToolLoopAgent` references verified; existing chat handler kept on AI SDK v6 stream contract.
- Amplify Gen 2 docs/API via Context7 and local package sources: `defineAuth`, `defineData`, owner authorization, `defineStorage` private paths, `createServerRunner`, server `getCurrentUser`, server `uploadData`/`getUrl`.
- Bedrock provider: existing installed `@ai-sdk/amazon-bedrock` `createAmazonBedrock` path preserved and changed from runtime `require` to ESM import for Next compatibility.

## Verification Commands / Results

- `bun remove ... && bun add next aws-amplify @aws-amplify/adapter-nextjs @aws-amplify/ui-react && bun add -d @aws-amplify/backend @aws-amplify/backend-cli` — success in prior batch; Bun reported peer warnings for React 19.2.4 and blocked postinstalls.
- `bun run test src/lib/chat-helpers.test.ts src/lib/chat-runtime.test.ts src/lib/storage/chat-store.test.ts src/lib/chat-handler.test.ts` — pass in prior batch, 25 tests.
- `bunx tsc --noEmit` — initially failed on AI SDK tool test types, Base UI props/events, React JSX namespace imports, S3 fallback fetch body typing, and migration-surfaced UI issues; now passes.
- `bunx biome check --write` — applied safe formatting/import fixes across checked files.
- `bun run check -- --max-diagnostics=200` — passes; 116 files checked.
- `bun run test src/lib/agents/registry.test.ts src/lib/chat-helpers.test.ts src/lib/chat-runtime.test.ts src/lib/storage/chat-store.test.ts src/lib/chat-handler.test.ts` — passes; 27 tests.
- `bun run test` — passes; 19 test files, 72 tests.
- Production build intentionally not run per project instruction.

## New Implementation Notes

- Added lazy `createDefaultAgentRegistry()` and Court Reporter agent metadata; chat handler now resolves the default Court Reporter agent through the registry.
- Kept `discoveryAgent` behavior intact while lazy-loading report bundle S3 storage so test imports do not require production S3 env.
- Fixed migration-surfaced typecheck issues in AI SDK tool tests, Base UI event handlers, HoverCard wrappers, React JSX imports, spinner props, and S3 fallback body typing.
- Replaced remaining `<img>` usages with `next/image` where required by Biome's Next rules.
- Updated stale skill-content tests to match the current checked-in skill files rather than old phrasing.

## Critical Verify Fix Batch (2026-05-07)

- Added `src/config/amplify-runtime.ts` and `bun run verify:amplify-config` so placeholder `amplify_outputs.json` fails explicitly until real Auth/Data/Storage outputs are generated by Amplify sandbox or deployment.
- Added local runtime evidence for route parity, owner isolation, Amplify Data graph calls, Amplify private Storage paths, attachment metadata flow, and misconfiguration handling.
- Replaced the Court Reporter registry alias to `discoveryAgent` with a dedicated `courtReporterAgent` runtime and Court Reporter system prompt that actively enforces draft-assistance / human-review boundaries.
- Updated `README.md`, `.env.example`, and `docs/amplify-sandbox-smoke.md` for the Next.js + Amplify + Bedrock + Storage environment contract and remaining sandbox smoke checks.

## Critical Fix Verification Commands / Results

- `bun run test src/config/amplify-runtime.test.ts src/lib/agents/registry.test.ts src/lib/storage/amplify-blob-store.test.ts src/lib/storage/amplify-chat-store.test.ts app/app-router-parity.test.tsx src/lib/chat-handler.test.ts` — passes; 6 files, 17 tests.
- `bunx tsc --noEmit` — passes.
- `bun run check -- --max-diagnostics=200` — passes; 123 files checked.
- `bun run test` — passes; 23 files, 83 tests.
- `bun run verify:amplify-config` — intentionally fails with explicit sandbox/deploy instructions while `amplify_outputs.json` is still the checked-in placeholder.
- Production build intentionally not run per project instruction.

## Amplify Sandbox Smoke Attempt (2026-05-07)

- `bun run verify:amplify-config` — still fails as intended because root `amplify_outputs.json` only contains `version`; missing `auth`, `data`, and `storage`.
- `bunx ampx --version` — blocked before any sandbox action; Amplify CLI reports `UnsupportedPackageManagerError: Package manager bun is not supported` and asks to use npm, yarn, or pnpm.
- `npm exec -- ampx --version` — blocked before any sandbox action under active `node v25.9.0`; crashes with `TypeError: localStorage.getItem is not a function` from `@typescript/vfs`.
- `aws sts get-caller-identity --profile default --region us-east-1` — succeeds, confirming the local AWS profile is authenticated as `arn:aws:iam::882816896907:user/CTOAdmin`; credentials are not the immediate blocker.
- No production deploy and no production build were run.

## Remaining Risks

- `amplify_outputs.json` is a placeholder until `ampx sandbox`/deployment generates real outputs; the new `verify:amplify-config` gate now fails fast and documents the required sandbox/deploy step.
- Local Amplify CLI execution was blocked under the previous toolchain: `bunx` is unsupported by Amplify CLI package-manager detection, and `npm exec -- ampx` crashed under Node.js v25.9.0. Use the pinned Node.js 22 LTS runtime with npm before retrying sandbox/deploy smoke.
- AmplifyChatStore and AmplifyBlobStore now have local mocked/path tests, but real Cognito/AppSync/S3 owner-policy behavior still requires the sandbox smoke checklist in `docs/amplify-sandbox-smoke.md`.
- S3 fallback code remains for rollback/report-bundle safety; remove only after Amplify Storage generated-output smoke succeeds.
- Existing local `mastra.db` data is not migrated automatically.

## Focused Toolchain / Docs Fix (2026-05-07)

- Added root `.nvmrc` with Node 22 and `package.json` `engines.node: ">=22 <23"` so Amplify CLI commands have an explicit LTS runtime contract.
- Added `amplify:sandbox` script as a thin Node/npm-backed Amplify CLI wrapper; latest guidance uses `npx ampx sandbox` while preserving Bun for normal app scripts.
- Updated `README.md`, `.env.example`, and `docs/amplify-sandbox-smoke.md` to use Node 22 LTS + npm for Amplify sandbox/deploy commands, and to explicitly avoid `bunx ampx ...` and non-LTS Node v25.

## Focused Fix Verification Commands / Results

- `bunx tsc --noEmit` — passes.
- `bun run check -- --max-diagnostics=200` — passes; 123 files checked.
- `bun run test` — passes; 23 files, 83 tests.
- `zsh -lc 'source "$HOME/.nvm/nvm.sh" && nvm use && node -v && npm exec -- ampx --version'` — blocked in this shell because `/Users/ricardoaltamirano/.nvm/nvm.sh` is not present; the repo now documents and pins the required Node 22/npm path for a maintainer machine with a Node version manager.
- Production build intentionally not run per project instruction.

## Immediate Mechanical Simplification Cleanup (2026-05-07)

- Deleted the remaining dead `src/mastra/` files and empty legacy `src/mastra/`, `src/routes/`, and `src/server/` directories after confirming no source imports remained.
- Removed dead Mastra/Exa package dependencies: `@mastra/core`, `@mastra/libsql`, `@mastra/loggers`, `@mastra/observability`, `mastra`, and `exa-js`; refreshed `bun.lock` with `bun install`.
- Deleted stale `.cta.json` and removed the stale `src/routeTree.gen.ts` Biome exclusion because the generated route tree file no longer exists.
- Removed obsolete TanStack/Nitro/Vinxi/Wrangler generated-artifact ignores (`.tanstack`, `.nitro`, `.vinxi`, `.wrangler`, `.output`) from `.gitignore`.

## Mechanical Cleanup Verification Commands / Results

- `bun install` — passes; lockfile saved, 6 packages removed.
- `bunx tsc --noEmit` — passes.
- `bun run check -- --max-diagnostics=200` — passes; 121 files checked.
- `bun run test` — passes; 23 files, 83 tests.
- Production build intentionally not run per project instruction.

## Mechanical Cleanup Intentionally Left Untouched

- Custom S3 signing fallback, LibsqlChatStore/local `mastra.db` runtime fallback, discovery report bundle storage, and working memory backend remain in place per scope.
- Local `mastra.db*` files are ignored and not tracked by git; they were left in the worktree conservatively as local runtime data.

## Global Chat / Runtime Audit Fix Batch (2026-05-08)

- [x] 9.7 Fix global chat/runtime audit regressions after Next.js + Amplify migration.

### Root Causes Fixed

- AI SDK v6 `DefaultChatTransport` was sending its default body shape plus custom `body`, while `parseChatRequest` requires `threadId`, `messages`, `trigger`, `messageId`, `modelId`, and `webSearchEnabled` at the top level. Added `prepareSendMessagesRequest` and regression coverage that validates the serialized payload through `parseChatRequest`.
- Chat failures from failed HTTP/model/server streams were only stored in `useChat().error` and surfaced through composer props, making runtime failures easy to miss in the conversation. Added a visible `role="alert"` runtime error block for empty and active conversations.
- The streaming chat route lacked explicit dynamic route config. Added `export const dynamic = "force-dynamic"` and a route config regression test.
- Amplify setup guidance still referenced older npm-wrapper wording or `bunx`; fail-fast runtime errors and docs now point to Node LTS plus `npx ampx sandbox`.
- Project `AGENTS.md` still described TanStack Start/Vite paths; updated it to the current Next.js App Router, Server Actions, Amplify, and AI SDK transport contracts.
- Logo image sizing used CSS-driven dimensions without explicit auto sizing; added inline `height: "100%", width: "auto"` for the Next image.

### Model ID Verification

- Checked installed `@ai-sdk/amazon-bedrock` source and AWS Bedrock Claude Sonnet 4.6 model card.
- AWS documents `us.anthropic.claude-sonnet-4-6` as the US geo inference ID for Claude Sonnet 4.6, so no model ID change was made.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 9.7 Transport serialization + visible runtime errors | `src/components/chat-interface.test.tsx` | Unit/component SSR | ✅ Existing targeted safety net passed 8/8 before changes | ✅ Added failing tests for missing exported serializer and alert component | ✅ Added `prepareChatSendMessagesRequest`, wired it into `DefaultChatTransport`, and added `ChatRuntimeError`; targeted test passed 6/6 | ✅ Covered submit and regenerate payload paths plus alert rendering | ✅ Kept serialization as a pure helper and error UI as a small exported component |
| 9.7 Amplify fail-fast message | `src/config/amplify-runtime.test.ts` | Unit | ✅ Existing targeted safety net passed 8/8 before changes | ✅ Updated expected command from stale `bunx` wording to `npx ampx sandbox` + Node LTS | ✅ Updated runtime error copy; targeted test passed 3/3 | ➖ Single copy contract | ✅ No extra abstraction needed |
| 9.7 Streaming route dynamic config | `app/api/chat/route.test.ts` | Unit/config | ✅ Existing targeted safety net passed 8/8 before changes | ✅ Added failing test for missing `dynamic` export | ✅ Added `export const dynamic = "force-dynamic"`; targeted test passed 1/1 | ➖ Single config export | ✅ No extra abstraction needed |

### Verification Commands / Results

- `bun run test src/components/chat-interface.test.tsx src/config/amplify-runtime.test.ts app/api/chat/route.test.ts app/app-router-parity.test.tsx` — passed; 4 files, 12 tests.
- `bunx tsc --noEmit` — passed.
- `bun run check -- --max-diagnostics=200` — passed; 124 files checked.
- `bun run test` — passed; 25 files, 91 tests.
- Production build intentionally not run per instruction.

### Remaining Blockers

- Root `amplify_outputs.json` is still the checked-in placeholder. Production fail-fast remains correct; chat/server actions that require Auth/Data/Storage will fail until the user generates real Amplify outputs.
- `app/page.tsx` still creates a new `nanoid()` for a blank root workspace render. I did not change it because a correct fix needs a deliberate route/session strategy; a low-risk mechanical change would either cause hydration risk or accidentally reuse a thread id across users.

## Amplify Storage Access Path Sandbox Fix (2026-05-08)

### Root Cause Fixed

- `amplify/storage/resource.ts` used `private/{entity_id}/sessions/*` as the Storage access rule. Amplify Gen 2 rejects that shape because `{entity_id}` must be the path part immediately before the ending wildcard. The object keys created by `AmplifyBlobStore` (`private/<identityId>/sessions/<threadId>/<file>`) were already valid nested keys under the private owner root; only the backend access rule was invalid.

### Implementation Notes

- Changed the access rule to `private/{entity_id}/*` and exported `AMPLIFY_PRIVATE_STORAGE_ACCESS_PATH` so the contract is explicit and regression-tested.
- Kept private per-identity isolation with `allow.entity("identity").to(["read", "write", "delete"])`.
- Kept attachment/generated object keys nested below each owned root at `private/<identityId>/sessions/...`; no broad authenticated access was introduced.
- Updated sandbox docs and runtime README notes to call out the valid Gen 2 rule and the nested object-key convention.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 4.2 Amplify Storage access rule fix | `amplify/storage/resource.test.ts`, `src/lib/storage/amplify-blob-store.test.ts` | Unit/config | ✅ Existing `src/lib/storage/amplify-blob-store.test.ts` passed 1/1 before changes | ✅ Added failing resource test expecting `private/{entity_id}/*`; failed because the constant/export did not exist | ✅ Updated `amplify/storage/resource.ts`; targeted storage tests passed 2/2 | ✅ Covered both backend access-rule shape and existing nested owner/session object-key behavior | ✅ Extracted access path constant and documented why keys stay nested under the owned root |

### Verification Commands / Results

- `bun run test src/lib/storage/amplify-blob-store.test.ts` — passed; 1 file, 1 test baseline before production change.
- `bun run test amplify/storage/resource.test.ts` — failed as expected in RED before implementation (`AMPLIFY_PRIVATE_STORAGE_ACCESS_PATH` was undefined).
- `bun run test amplify/storage/resource.test.ts src/lib/storage/amplify-blob-store.test.ts` — passed; 2 files, 2 tests.
- `bunx tsc --noEmit` — passed.
- `bun run check -- --max-diagnostics=200` — passed; 125 files checked.
- `bun run test` — passed; 26 files, 92 tests.
- `npx ampx sandbox --help` — passed without deploying; confirmed CLI is reachable and only printed sandbox help.
- Production build intentionally not run per instruction.

## Amplify Outputs Zod Compatibility Fix (2026-05-08)

### Root Cause Fixed

- The app declared direct dependency `zod: ^4`, which installed Zod 4.3.6 at the project root. `@aws-amplify/backend-output-schemas@1.8.0` declares exact peer `zod: 3.25.17`; under Zod 4, one-argument `z.record(valueSchema)` treats the value schema as a key schema and can reject CloudFormation-style stack metadata keys such as `AWS::Amplify::GraphQL` with `invalid_key`. That let `npx ampx sandbox` deploy successfully but fail during generated outputs parsing.

### Implementation Notes

- Pinned the direct app dependency to `zod: 3.25.17`, matching the Amplify backend output schema peer exactly.
- Refreshed `bun.lock` with `bun install`.
- Documented the pin in `docs/amplify-sandbox-smoke.md` so future dependency upgrades do not silently reintroduce Zod 4 for Amplify CLI output generation.
- Checked AI SDK compatibility through the real gates. The installed AI SDK packages declare `zod: ^3.25.76 || ^4.1.8`, but the app's actual AI SDK/tool usage still typechecks and passes the full test suite with the Amplify-supported root Zod 3.25.17. Prioritized the Amplify CLI peer because this failure blocks sandbox output generation.

### TDD Cycle Evidence

| Task | Test / Command | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|----------------|-------|------------|-----|-------|-------------|----------|
| 9.8 Amplify outputs Zod compatibility | Node Zod/Amplify schema one-liner, `bunx tsc --noEmit`, `bun run check -- --max-diagnostics=200`, `bun run test` | Dependency/runtime config | ✅ Existing full suite passed before latest dependency change in prior fix batch | ✅ Reproduced Zod 4 record mismatch locally with `z.record(z.object(...))` returning `invalid_key` for `AWS::Amplify::GraphQL` | ✅ After pinning to Zod 3.25.17, the same record shape and `unifiedBackendOutputSchema` sample parse both passed | ✅ Full TypeScript, Biome, and Vitest gates passed with AI SDK and app schemas on the pinned Zod version | ✅ Kept the fix to the direct dependency pin plus one docs note; no app runtime workaround or schema patching introduced |

### Verification Commands / Results

- `node -e 'const { z } = require("zod"); const schema = z.record(z.object({ version: z.literal("1") })); ...'` before the fix — failed with Zod 4.3.6 `invalid_key` for `AWS::Amplify::GraphQL`.
- `bun install` — passed; root `zod` resolved to `3.25.17` and lockfile was saved.
- `node -e '... genericRecordSuccess ... amplifyBackendOutputSuccess ...'` — passed with `{ "zod": "3.25.17", "genericRecordSuccess": true, "amplifyBackendOutputSuccess": true }`.
- `bunx tsc --noEmit` — passed.
- `bun run check -- --max-diagnostics=200` — passed; 125 files checked.
- `bun run test` — passed; 26 files, 92 tests.
- Production build intentionally not run per instruction.

### Remaining Blockers

- A real `npx ampx sandbox` run still needs to be retried by the user to generate root `amplify_outputs.json`; this fix proves the local schema/version incompatibility is removed without redeploying from this apply step.

## Post-Sandbox Verification Milestone (2026-05-08)

### Sandbox / Config Status

- User successfully ran `nvm use && npx ampx sandbox`; Amplify deployment completed and wrote root `amplify_outputs.json`.
- `amplify_outputs.json` was inspected only at the section/key level. Required top-level sections are present: `auth`, `data`, and `storage`.
- `bun run verify:amplify-config` now passes with real generated outputs: `Amplify outputs include Auth, Data, and Storage sections.`
- No secret values from `amplify_outputs.json` were exposed in verification output.

### Verification Commands / Results

- `bunx tsc --noEmit` — passed.
- `bun run check -- --max-diagnostics=200` — passed; 125 files checked.
- `bun run test` — passed; 26 files, 92 tests.
- `bun run test app/api/chat/route.test.ts app/app-router-parity.test.tsx src/lib/chat-handler.test.ts src/lib/agents/registry.test.ts src/config/amplify-runtime.test.ts src/lib/storage/amplify-chat-store.test.ts src/lib/storage/amplify-blob-store.test.ts` — passed; 7 files, 18 tests.
- Production build intentionally not run per instruction.

### Remaining Smoke Work

- Local repository health is green with real Amplify outputs present.
- Manual browser/cloud smoke is still required before archive/release: login as two users, confirm thread ownership isolation, create chat with attachment, verify Data graph traceability, verify S3 private-object denial across users, confirm `/api/chat` streams progressively, and confirm Court Reporter safety language.
