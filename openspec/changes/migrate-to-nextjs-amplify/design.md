# Design: Migrate to Next.js + Amplify Gen 2

## Technical Approach

Replace TanStack Start/Vite with Next.js App Router and make Amplify Gen 2 the production backend: Auth for identity, Data for session/message/output metadata, and Storage for private files/artifacts. Keep the existing AI SDK chat loop shape by adapting `createChatPostHandler` to a Next Route Handler, but swap persistence behind repository/adapter seams instead of carrying libsql/custom S3 as the default runtime.

## Architecture Decisions

| Decision | Alternatives considered | Rationale |
|---|---|---|
| Next.js App Router replaces TanStack routes | Hybrid TanStack+Next | User selected replacement; avoids dual routing and preserves App Router idioms. |
| Amplify Data/Storage are target runtime | Transitional libsql/custom S3 adapters | Spec requires Data/Storage ownership. Keeping old stores would undercut the Next.js+Amplify base; retain interfaces only for tests/migration helpers. |
| Server identity seam | Hardcoded `RESOURCE_ID` | `getCurrentUser`/server context supplies Cognito identity for all repositories. |
| Next Route Handler for chat streaming | Separate Amplify Function first | AI SDK and Next support Web `Response` streaming in route handlers; fewer runtime boundaries. |
| Agent registry | Keep `discoveryAgent` singleton | Supports Court Reporter MVP and future agents without rewiring chat handler. |

## Data Flow

```text
Browser ──useChat──> app/api/chat/route.ts
  │                    │ authenticate request
  │                    ├─ ChatRepository(Amplify Data): sessions/messages/outputs
  │                    ├─ BlobStore(Amplify Storage): private/{identityId}/sessions/{sessionId}/...
  │                    └─ AgentRegistry → court-reporter ToolLoopAgent → Bedrock
  └─ Server Actions <──┘ threads/messages/memory metadata
```

Amplify Data models: `User`, `AgentConfig`, `Session`, `Message`, `File`, `GeneratedOutput`. Store ordered messages with `sessionId`, `position`, `role`, `payloadJson`, `owner`, timestamps. Files/outputs store Storage key, media type, size, source message/session, owner.

## File Changes

| File | Action | Description |
|---|---|---|
| `app/layout.tsx`, `app/page.tsx`, `app/c/[threadId]/page.tsx` | Create | Next shell and route parity. |
| `app/api/chat/route.ts` | Create | `export async function POST(req)` calls chat handler with auth-scoped deps. |
| `app/actions/{threads,messages,memory}.ts` | Create | Server Actions replacing `createServerFn`. |
| `amplify/{backend.ts,auth/resource.ts,data/resource.ts,storage/resource.ts}` | Create | Gen 2 backend/Auth/Data/Storage definitions. |
| `src/lib/auth/server.ts` | Create | Server-only current user/owner resolver. |
| `src/lib/storage/{chat-repository.ts,amplify-chat-store.ts,amplify-blob-store.ts}` | Create/Modify | Repository interfaces and Amplify adapters. |
| `src/lib/agents/{registry.ts,court-reporter-agent.ts}` | Create | Agent lookup and Court Reporter prompt/tools. |
| `src/routes/*`, `src/router.tsx`, `vite.config.ts` | Delete | TanStack/Vite runtime removed; do not edit `src/routeTree.gen.ts`, delete generated output. |
| `package.json`, `tsconfig.json`, tests | Modify | Next/Amplify deps, Bun scripts, route/action tests. |

## Interfaces / Contracts

```ts
type OwnerContext = { userId: string; identityId: string };
interface ChatRepository extends ChatStore {
  listFiles(sessionId: string, owner: OwnerContext): Promise<FileRecord[]>;
  saveGeneratedOutput(record: GeneratedOutputRecord, owner: OwnerContext): Promise<void>;
}
interface AgentRegistry { get(agentId: string): StreamAgent; }
```

## Official-doc Verification Points

Before implementation, verify: Next Route Handlers can return streaming Web `Response`; Server Actions serialization/caching rules; Amplify Gen 2 `defineAuth`, `defineData`, owner authorization, Next server runtime helpers, and `defineStorage` private access paths; AI SDK v6 `createUIMessageStreamResponse`/`ToolLoopAgent` behavior in Next handlers; `@ai-sdk/amazon-bedrock` model/provider options.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | request validation, repository ordering, storage keys, auth owner mapping | Vitest with mocked Amplify clients. |
| Integration | route parity, Server Actions, chat stream persistence/regenerate | Route/action tests with fake agent and in-memory adapters. |
| E2E/manual | login, create thread, upload file/PDF, stream response, download output | Bun test plus Amplify sandbox smoke checklist. |

## Migration / Rollout

Single PR is an explicit maintainer review exception. Keep reviewable by committing coherent slices: dependency/config scaffold, app routes, auth, Data/Storage adapters, chat route, UI navigation, tests. Rollback is reverting the PR; no dual runtime is planned. Existing `mastra.db` data is not migrated automatically; if preservation is required, add a one-off export/import script before release.

## Open Questions

- [ ] Confirm whether existing local libsql data must be migrated or can be discarded for the Amplify launch.
