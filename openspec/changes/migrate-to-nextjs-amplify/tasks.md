# Tasks: Next.js + Amplify Gen 2

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1500–2500 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: scaffold + auth + routes; PR 2: Data/Storage adapters + server actions; PR 3: UI migration + agents + tests + cleanup |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Scaffold, Amplify backend, auth shell | PR 1 | Config + layout + route shell |
| 2 | Data/Storage adapters, chat API, Server Actions | PR 2 | Persistence + streaming |
| 3 | UI migration, agent registry, tests, cleanup | PR 3 | Integration + TanStack removal |

## Phase 1: Foundation & Docs

- [x] 1.1 Verify Next.js streaming Response docs
- [x] 1.2 Verify Amplify Gen 2 defineAuth/defineData/defineStorage docs
- [x] 1.3 Verify AI SDK v6 streaming + Bedrock provider docs
- [x] 1.4 Install Next.js/Amplify deps; update package.json scripts
- [x] 1.5 Create next.config.ts; update tsconfig.json
- [x] 1.6 Scaffold amplify backend, auth, data, storage resources

## Phase 2: Auth & Identity

- [x] 2.1 Create src/lib/auth/server.ts with getCurrentUser
- [x] 2.2 Replace hardcoded RESOURCE_ID with authenticated owner context
- [x] 2.3 Add Amplify auth provider to app/layout.tsx

## Phase 3: Data Layer

- [x] 3.1 Define Amplify Data models (Session, Message, File, Output, User, AgentConfig)
- [x] 3.2 Implement AmplifyChatStore behind ChatStore interface
- [x] 3.3 Add owner authorization rules

## Phase 4: Storage Layer

- [x] 4.1 Implement AmplifyBlobStore behind BlobStore interface
- [x] 4.2 Configure private storage paths
- [x] 4.3 Update attachment flows to use Amplify Storage

## Phase 5: App Router & Server Actions

- [x] 5.1 Create app/layout.tsx
- [x] 5.2 Create app/page.tsx
- [x] 5.3 Create app/c/[threadId]/page.tsx
- [x] 5.4 Create app/api/chat/route.ts streaming handler
- [x] 5.5 Convert src/server/*.ts to app/actions/*.ts

## Phase 6: UI Migration

- [x] 6.1 Replace TanStack hooks with next/navigation in chat-interface.tsx
- [x] 6.2 Replace TanStack Link with next/link in app-sidebar.tsx
- [x] 6.3 Update DefaultChatTransport endpoint

## Phase 7: Agent Registry

- [x] 7.1 Create src/lib/agents/registry.ts
- [x] 7.2 Create court-reporter agent config
- [x] 7.3 Wire registry into chat handler

## Phase 8: Testing

- [x] 8.1 Unit tests for AmplifyChatStore and AmplifyBlobStore
- [x] 8.2 Route parity tests for app pages
- [x] 8.3 Chat stream integration test
- [x] 8.4 Auth ownership isolation test
- [x] 8.5 Attachment flow verification

## Phase 9: Cleanup

- [x] 9.1 Delete src/routes/*, src/router.tsx, src/routeTree.gen.ts
- [x] 9.2 Delete vite.config.ts and TanStack Start deps
- [ ] 9.3 Remove dead custom S3 signing code
- [x] 9.4 Final lint and typecheck pass
- [x] 9.5 Fix Next/Turbopack global CSS package import resolution
- [x] 9.6 Fix Tailwind v4 PostCSS processing so global utilities and shadcn tokens apply
- [x] 9.7 Fix global chat/runtime audit regressions after Next.js + Amplify migration
- [x] 9.8 Fix Amplify outputs generation Zod compatibility
- [x] 9.9 Fix Amplify Auth UX and route protection for private workspace access
