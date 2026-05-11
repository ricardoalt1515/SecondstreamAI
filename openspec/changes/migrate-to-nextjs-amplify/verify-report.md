# Verification Report

**Change**: migrate-to-nextjs-amplify  
**Version**: N/A  
**Mode**: Standard (Strict TDD not active)  
**Artifact store**: hybrid  
**Verification pass**: post-sandbox-config, 2026-05-08

---

### Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 35 |
| Tasks complete | 34 |
| Tasks incomplete/deferred | 1 |

Incomplete/deferred tasks:

- [ ] 9.3 Remove dead custom S3 signing code — intentionally deferred. S3 remains as explicit rollback/report-bundle fallback via `CHAT_BLOB_STORE_RUNTIME=s3` until Amplify Storage generated-output smoke passes.

Completeness finding: prior local CRITICAL gaps were addressed. The real Amplify sandbox/config milestone is now complete: generated `amplify_outputs.json` contains Auth, Data, and Storage sections and the config gate passes. Remaining work is manual browser/cloud smoke evidence, not local repository health.

---

### Build & Tests Execution

**Build**: ➖ Not run  
Production build was intentionally skipped because project instructions say not to build.

**Typecheck**: ✅ Passed

```text
bunx tsc --noEmit
# exit code 0, no diagnostics
```

**Biome check**: ✅ Passed

```text
bun run check -- --max-diagnostics=200
Checked 125 files in 71ms. No fixes applied.
```

**Tests**: ✅ 92 passed / ❌ 0 failed / ⚠️ 0 skipped

```text
bun run test
Test Files  26 passed (26)
Tests       92 passed (92)
Duration    3.92s
```

**Amplify config gate**: ✅ Passed with real generated outputs

```text
bun run verify:amplify-config
Amplify outputs include Auth, Data, and Storage sections.
```

**Amplify outputs shape inspection**: ✅ Required sections present

```text
amplify_outputs.json top-level sections: auth, data, storage, version
required sections present: auth, data, storage
auth: object with keys: aws_region, groups, identity_pool_id, mfa_configuration, mfa_methods, password_policy, standard_required_attributes, unauthenticated_identities_enabled, user_pool_client_id, user_pool_id, user_verification_types, username_attributes
data: object with keys: authorization_types, aws_region, default_authorization_type, model_introspection, url
storage: object with keys: aws_region, bucket_name, buckets
```

Only section/key names were inspected and recorded; secret or environment-specific values were not exposed. The user reported `nvm use && npx ampx sandbox` completed successfully and wrote `amplify_outputs.json`.

**Targeted route/runtime tests**: ✅ Passed

```text
bun run test app/api/chat/route.test.ts app/app-router-parity.test.tsx src/lib/chat-handler.test.ts src/lib/agents/registry.test.ts src/config/amplify-runtime.test.ts src/lib/storage/amplify-chat-store.test.ts src/lib/storage/amplify-blob-store.test.ts
Test Files  7 passed (7)
Tests       18 passed (18)
Duration    938ms
```

Production build intentionally not run per instruction.

**Coverage**: ➖ Not available / threshold: N/A

```text
bun run test -- --coverage
MISSING DEPENDENCY  Cannot find dependency '@vitest/coverage-v8'
exit code 1
```

Coverage is unavailable because the Vitest coverage provider is not installed; this is not treated as a release blocker in Standard mode because no coverage threshold is configured.

---

### Spec Compliance Matrix

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Next.js App Runtime | Route parity is preserved | `app/app-router-parity.test.tsx > App Router route parity` | ✅ COMPLIANT locally |
| Amplify Auth Identity | Ownership comes from auth | `src/lib/chat-handler.test.ts > rejects access to a thread owned by another authenticated user`; `src/lib/storage/amplify-chat-store.test.ts > filters listed sessions by authenticated owner id`; `bun run verify:amplify-config` | ⚠️ PARTIAL — real outputs exist and local owner isolation passes; two-user Cognito/AppSync browser smoke still required |
| Amplify Data Ownership Model | Session graph is representable | `src/lib/storage/amplify-chat-store.test.ts > persists a session/message graph that traces records to the owner and session` | ✅ COMPLIANT locally |
| Amplify Storage Ownership | Files stay private and usable | `src/lib/storage/amplify-blob-store.test.ts > builds private owner/session paths`; `amplify/storage/resource.ts`; generated `amplify_outputs.json` storage section | ⚠️ PARTIAL — real storage output exists and local path/policy shape passes; unrelated-user denial requires browser/cloud smoke |
| Streaming Chat Preservation | Streaming behavior survives migration | `src/lib/chat-handler.test.ts > api/chat handler` | ✅ COMPLIANT locally — handler stream/persistence/regeneration/error/tool-output paths pass; route handler delegates to `chatPost` |
| Court Reporter MVP Readiness | Court reporter completes the core flow | `src/lib/agents/registry.test.ts > wires the default court reporter runtime instead of the discovery agent`; `src/lib/agents/court-reporter-runtime.ts` | ✅ COMPLIANT locally |
| Configuration and Verification | Misconfiguration is caught before release | `src/config/amplify-runtime.test.ts`; `bun run verify:amplify-config`; section-only `amplify_outputs.json` inspection | ✅ COMPLIANT — real outputs include Auth, Data, and Storage and config verification passes |

**Compliance summary**: 5/7 scenarios compliant by local runtime evidence plus real config output evidence; 2/7 remain partial until browser/cloud smoke proves two-user Cognito/AppSync/S3 ownership/privacy behavior.

---

### Correctness (Static — Structural Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| Next.js App Runtime | ✅ Implemented | `app/layout.tsx`, `app/page.tsx`, `app/c/[threadId]/page.tsx`, `app/api/chat/route.ts`, and `app/actions/*` exist. TanStack route files, `src/router.tsx`, `src/routeTree.gen.ts`, and `vite.config.ts` are absent. |
| Amplify Auth Identity | ✅ Local / ⚠️ Browser smoke pending | `src/lib/auth/server.ts` resolves Cognito user/session and `chatPost` injects `getCurrentOwner`; handler rejects cross-owner thread access. Real Auth outputs exist; two-user browser smoke is still required. |
| Amplify Data Ownership Model | ✅ Local / ⚠️ Browser smoke pending | `amplify/data/resource.ts` defines User, AgentConfig, Session, Message, File, GeneratedOutput with owner auth; `AmplifyChatStore` has mocked Data graph tests. Real Data outputs exist; AppSync owner enforcement still needs smoke evidence. |
| Amplify Storage Ownership | ✅ Local / ⚠️ Browser smoke pending | `amplify/storage/resource.ts` defines the Gen 2-valid owner root `private/{entity_id}/*`; `AmplifyBlobStore` builds nested owner/session object keys below that root. Real Storage outputs exist; S3 private access denial requires smoke evidence. |
| Streaming Chat Preservation | ✅ Implemented | `app/api/chat/route.ts` delegates to `chatPost`; handler tests pass for persistence, regeneration, attachment rehydration path, errors, tool output, and title generation. |
| Court Reporter MVP Readiness | ✅ Fixed locally | `createDefaultAgentRegistry()` now imports `courtReporterAgent`; `court-reporter-runtime.ts` uses `COURT_REPORTER_SYSTEM_PROMPT` and explicitly frames output as draft assistance requiring human review. |
| Configuration and Verification | ✅ Fixed and passed with real outputs | `src/config/amplify-runtime.ts`, README, `.env.example`, and `docs/amplify-sandbox-smoke.md` document and enforce the Amplify outputs/Bedrock/storage contract. Root `amplify_outputs.json` now contains Auth, Data, and Storage sections. |

---

### Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| Next.js App Router replaces TanStack routes | ✅ Yes | App Router files are active; TanStack Start/Vite runtime files are removed. |
| Amplify Data/Storage are target runtime | ✅ Yes, with explicit fallback | Default store/blob runtime uses Amplify. Libsql/S3 are opt-in fallback paths only. |
| Server identity seam replaces hardcoded RESOURCE_ID | ✅ Yes in production path | `createChatPostHandler` now requires `getOwner`; default handler injects `getCurrentOwner`. Tests provide explicit fake owners. |
| Next Route Handler for chat streaming | ✅ Yes | `app/api/chat/route.ts` returns the AI SDK chat response through `chatPost`. |
| Agent registry supports Court Reporter/future agents | ✅ Yes | Registry defaults to the Court Reporter runtime, not the Discovery agent alias. |

---

### Re-evaluation of Prior CRITICAL Findings

| Prior finding | Current classification | Evidence |
|---------------|------------------------|----------|
| Missing real Amplify outputs / sandbox verification | Fixed for config; WARNING for manual smoke | User ran `nvm use && npx ampx sandbox`; root `amplify_outputs.json` now contains Auth/Data/Storage and `bun run verify:amplify-config` passes. Manual two-user/cloud smoke still pending. |
| Runtime scenarios untested locally | Fixed locally / WARNING for cloud enforcement | New tests cover route parity, owner checks, Data graph calls, Storage path shape, attachment metadata, and config failure. Cloud owner/privacy enforcement still needs sandbox. |
| Court Reporter prompt not active | Fixed local | Registry test proves default agent is `courtReporterAgent` and not `discoveryAgent`; runtime imports Court Reporter prompt. |
| Env/docs stale | Fixed local | README, `.env.example`, and `docs/amplify-sandbox-smoke.md` now document Next.js + Amplify outputs + Bedrock + storage fallback contract. |

---

### Issues Found

**CRITICAL**: None for local repository health after real outputs/config verification.

**WARNING** (should fix / track):

1. Amplify Auth/Data/Storage owner isolation is only locally mocked/structurally verified plus real-output config verified. The sandbox checklist must still capture evidence for two-user isolation, Data graph traceability, Storage privacy denial, `/api/chat` streaming, and Court Reporter safety.
2. S3 fallback remains intentionally for rollback/report-bundle safety. Remove it only after Amplify Storage generated-output smoke succeeds.
3. Existing local `mastra.db` data is not migrated automatically; release still needs a product decision if preservation matters.
4. Coverage command is configured by convention but not usable because `@vitest/coverage-v8` is not installed.

**SUGGESTION** (nice to have):

1. Add a focused `app/api/chat/route.ts` Route Handler smoke test in addition to `createChatPostHandler` tests.
2. Add a scripted sandbox verification command once Amplify outputs are generated, so the manual checklist becomes repeatable evidence.

---

### Archive / Release Readiness

Not ready to archive yet. Local verification is green and the real Amplify outputs/config milestone is complete, but the change still requires manual sandbox/browser smoke because the spec requires authenticated ownership and private storage behavior that only real Amplify Auth/Data/Storage user flows can prove.

Recommended next step: run the manual smoke checklist in `docs/amplify-sandbox-smoke.md` against the active sandbox: two-user login/ownership, Data graph traceability, Storage private object denial, `/api/chat` progressive streaming/persistence, and Court Reporter safety language. Then rerun SDD verify and proceed to archive if the smoke evidence passes.

---

### Verdict

PASS WITH WARNINGS for post-sandbox local verification; not archive-ready until manual cloud smoke passes.

The real Amplify output/config gate is now green and all non-build local gates pass. Remaining risk is browser/cloud behavior evidence for Cognito/AppSync/S3 ownership and privacy.
