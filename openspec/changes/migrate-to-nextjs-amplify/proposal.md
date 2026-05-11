# Proposal: Migrate to Next.js + Amplify Gen 2

## Intent

Replace TanStack Start/Vite with Next.js App Router and establish Amplify Gen 2 as the required deployment/backend foundation while preserving the working AI chat loop. This reduces framework mismatch, adds real auth, and prepares the app for production Amplify hosting without guessing beyond official docs.

## Scope

### In Scope
- Replace TanStack Start routing/build with Next.js App Router, Route Handlers, and Server Actions.
- Add Amplify Gen 2 foundation and Auth; replace hardcoded `RESOURCE_ID = "user-id"` with authenticated identity.
- Preserve `chat-handler.ts`, AI SDK ToolLoopAgent runtime, `ChatStore`, and `BlobStore` boundaries where possible.
- Update navigation, server functions, env handling, package scripts/dependencies, and tests affected by framework migration.
- Single PR delivery is maintainer-selected despite likely exceeding the 400-line review budget.

### Out of Scope
- Full Amplify Data/DynamoDB rewrite of relational chat storage.
- Full replacement of custom S3 blob storage unless official Amplify Storage integration is straightforward within the migration.
- Specs/tasks/implementation work in this phase.

## Capabilities

### New Capabilities
- `nextjs-amplify-runtime`: Next.js App Router application hosted/configured with Amplify Gen 2 Auth and backend foundation.

### Modified Capabilities
- None; no existing OpenSpec specs were found.

## Approach

Use official Next.js, Amplify Gen 2, and AI SDK documentation during implementation. Replace TanStack-specific route/server glue with Next.js equivalents, keep framework-agnostic chat/storage interfaces stable, and treat Amplify Data/Storage migration as a follow-up unless docs confirm a safe low-risk swap.

## Affected Areas

| Area | Impact | Description |
|---|---:|---|
| `src/routes/`, `src/router.tsx` | Removed | Replaced by `app/` routes/layout/API. |
| `src/server/*.ts` | Modified | `createServerFn` becomes Server Actions/handlers. |
| `src/components/*` | Modified | TanStack Router hooks become Next navigation/link APIs. |
| `src/lib/chat-handler.ts` | Preserved | Reused through Next Route Handler adapter. |
| `src/lib/storage/*` | Preserved/Modified | Keep interfaces; defer NoSQL redesign. |
| `package.json`, `vite.config.ts`, `tsconfig.json` | Modified/Removed | Next.js build/runtime replaces Vite/TanStack Start. |
| `amplify/*` | New | Amplify Gen 2 backend/Auth foundation. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---:|---|
| PR exceeds 400 changed lines | High | Explicit maintainer single-PR exception; keep scope disciplined. |
| SQLite-to-DynamoDB impedance mismatch | High | Defer full Amplify Data rewrite; preserve `ChatStore`. |
| Streaming behavior on Amplify Hosting | Medium | Verify official Next.js/Amplify streaming support before implementation. |
| Router refactor regressions | Medium | Systematic route parity checks and targeted tests. |

## Rollback Plan

Revert the single migration PR to restore TanStack Start/Vite, existing routes/server functions, libsql chat persistence, and custom S3 storage.

## Dependencies

- Official Next.js App Router, Amplify Gen 2, Amplify Hosting/Auth, and AI SDK v6 docs/source verification.
- Bun package scripts from `package.json`.

## Success Criteria

- [ ] App runs on Next.js with TanStack Start/Vite removed.
- [ ] Amplify Gen 2 backend/Auth foundation is present and documented.
- [ ] Chat streaming, threads, messages, memory, and attachments retain current behavior.
- [ ] Hardcoded single-user resource ID is replaced or isolated behind authenticated identity plumbing.
