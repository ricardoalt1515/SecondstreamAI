# AGENTS.md

## Fast Truth Sources

- Command surface: `package.json`
- Lint/format scope and exclusions: `biome.json`
- Amplify setup/smoke checklist: `docs/amplify-sandbox-smoke.md`
- Amplify runtime fail-fast contract: `src/config/amplify-runtime.ts`
- Runtime env contract: `src/config/env.ts`
- Request validation and attachment limits: `src/lib/chat-helpers.ts`
- Main chat execution path: `src/lib/chat-handler.ts`

## Project Shape (Current)

- Single-package app (not a monorepo): Next.js App Router + React 19 + TypeScript.
- Frontend routes: `app/page.tsx`, `app/c/[threadId]/page.tsx`, `app/layout.tsx`.
- Chat API endpoint: `POST /api/chat` in `app/api/chat/route.ts`.
- Server Actions used by UI live in `app/actions/*.ts` (`threads`, `messages`, `memory`).
- Chat runtime uses AI SDK `ToolLoopAgent` (`src/lib/agents/discovery-agent.ts`, Court Reporter via `src/lib/agents/court-reporter-runtime.ts`), not Mastra workflows.

## Commands

- Install deps: `bun install`
- Dev server (port 3000): `bun run dev`
- Full tests: `bun run test`
- Single test file: `bun run test src/lib/chat-helpers.test.ts`
- Amplify sandbox: `nvm use` then `npx ampx sandbox` (or `bun run amplify:sandbox` after `nvm use`)
- Amplify config check: `bun run verify:amplify-config`
- Lint: `bun run lint`
- Format: `bun run format`
- Combined Biome check: `bun run check`
- No dedicated typecheck script; if needed run `bunx tsc --noEmit`.

## Runtime Constraints You Can Easily Miss

- `parseChatRequest` only accepts catalog model IDs from `src/config/models.ts` (currently `claude-sonnet-4-6`).
- AI SDK v6 `DefaultChatTransport` must use `prepareSendMessagesRequest` so `/api/chat` receives `threadId`, `messages`, `trigger`, `messageId`, `modelId`, and `webSearchEnabled` in the shape parsed by `parseChatRequest`.
- Attachments: max 5 files, max 4 MB each, allowed MIME families are `text/*`, `image/*`, `application/pdf`.
- PDF attachments require non-empty text in the same message (`DOCUMENT_TEXT_REQUIRED`).
- Amplify outputs are intentionally fail-fast: root `amplify_outputs.json` must contain `auth`, `data`, and `storage`; do not bypass this for production paths.
- Use Node LTS for Amplify CLI. Official local sandbox command: `npx ampx sandbox`; do not suggest Bun for Amplify CLI commands.
- Production owner context comes from Amplify Auth via `src/lib/auth/server.ts`; tests may inject fake owners.
- Default chat metadata/blob runtime is Amplify Data/Storage. Optional rollback fallbacks remain: `CHAT_STORE_RUNTIME=libsql` and `CHAT_BLOB_STORE_RUNTIME=s3`.
- S3 fallback writer is custom-signed (`src/lib/storage/s3-blob-store.ts`) and requires `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` when used.

## Tooling and Generated Files

- TanStack Start/Vite route files are removed; do not recreate `src/routes/*`, `src/router.tsx`, `src/routeTree.gen.ts`, or `vite.config.ts`.
- Biome intentionally excludes generated `.next` output and `src/styles.css`.
- Biome `files.includes` is explicit; if a new file is outside includes, `bun run check` will not touch it.

## Skill and Agent Wiring Gotchas

- The active assistant toolchain is `loadSkill` only (`src/lib/agents/discovery-agent.ts`).
- `webSearchEnabled` is in request/draft types, but composer currently always sends `false` and no web-search tool is wired into the active agent.
- UI supports `tool-updateWorkingMemory` rendering, but the active agent does not currently expose that tool.
- If you add/remove skills, keep these in sync:
  - skill list in `src/lib/agents/discovery-agent.ts`
  - fallback error list in `src/ai/tools/load-skill.ts`
  - `EXPECTED_SKILLS` in `src/ai/skills/skills-integration.test.ts`
