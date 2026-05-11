# Apply Progress: Invite-Only Auth

**Change**: invite-only-auth  
**Mode**: Strict TDD  
**Delivery**: single-pr  
**Updated**: 2026-05-11

## Completed Tasks

- [x] 1.1 Create backend invite-only config test.
- [x] 1.2 Configure Cognito User Pool `adminCreateUserConfig.allowAdminCreateUserOnly = true`.
- [x] 1.3 Run backend targeted test.
- [x] 2.1 Create login view test for hidden sign-up behavior.
- [x] 2.2 Add `hideSignUp` to the Amplify UI `Authenticator`.
- [x] 2.3 Run login view targeted test.
- [x] 3.1 Add docs-supported admin invitation email copy preserving `username()` and `code()` callbacks.
- [x] 3.2 Update sandbox smoke docs for invited user login and blocked public self-registration.
- [x] 4.1 Run TypeScript and Biome gates.
- [x] 4.2 Run full Vitest suite.
- [x] 4.3 Run Amplify config verification because `amplify_outputs.json` exists.

## Remaining Tasks

- [ ] 4.4 Manual sandbox smoke: under Node LTS (`nvm use`), run `npx ampx sandbox`; create/admin-invite a user, complete first sign-in, and confirm direct public `SignUp` is rejected. Not run in apply because the launch instructions said not to run sandbox/deploy unless necessary.

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `amplify/backend.ts` | Modified | Captured `defineBackend()` return and set the Cognito User Pool admin-create-user-only override. |
| `amplify/backend.test.ts` | Created | Verifies the backend CDK override sets `allowAdminCreateUserOnly: true`. |
| `app/login/login-view.tsx` | Modified | Added `hideSignUp` while preserving `initialState="signIn"`, email login, and redirect behavior. |
| `app/login/login-view.test.tsx` | Created | Verifies the login view passes `hideSignUp`, sign-in initial state, and email login to `Authenticator`. |
| `amplify/auth/resource.ts` | Modified | Added admin invitation subject/body using Amplify Gen 2 `userInvitation` callbacks. |
| `amplify/auth/resource.test.ts` | Created | Verifies invitation copy preserves Cognito username and temporary-password placeholders. |
| `docs/amplify-sandbox-smoke.md` | Modified | Documents admin-created user first sign-in and blocked direct Cognito `SignUp` smoke checks. |
| `docs/amplify-sandbox-smoke.test.ts` | Created | Verifies smoke docs retain invite-only workflow wording. |
| `openspec/changes/invite-only-auth/tasks.md` | Modified | Marked completed apply tasks. |
| `openspec/changes/invite-only-auth/apply-progress.md` | Created | Records cumulative apply progress and verification evidence. |

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1-1.3 | `amplify/backend.test.ts` | Unit/config | ✅ `amplify/storage/resource.test.ts` 1/1 baseline | ✅ Failed with `adminCreateUserConfig` undefined | ✅ `bun run test amplify/backend.test.ts` passed | ➖ Structural config, single required output | ✅ Minimal override only |
| 2.1-2.3 | `app/login/login-view.test.tsx` | Integration/component | ✅ `app/login/page.test.tsx` 1/1 baseline | ✅ Failed because `hideSignUp` was absent | ✅ `bun run test app/login/login-view.test.tsx` passed | ✅ Asserts `hideSignUp`, `initialState`, and `loginMechanisms` together | ✅ Kept existing redirect child and props intact |
| 3.1 | `amplify/auth/resource.test.ts` | Unit/config | N/A (new behavioral config coverage) | ✅ Failed because `userInvitation` was absent | ✅ `bun run test amplify/auth/resource.test.ts` passed | ✅ Two placeholder callback inputs verify username and temporary password are dynamic | ✅ Used documented `userInvitation` shape from installed Amplify types |
| 3.2 | `docs/amplify-sandbox-smoke.test.ts` | Unit/docs | N/A (new docs guard) | ✅ Failed because invited-user and blocked-registration wording was absent | ✅ `bun run test docs/amplify-sandbox-smoke.test.ts` passed | ✅ Separate assertions for first sign-in flow and direct `SignUp` rejection | ✅ Replaced public create-account wording with invite-only smoke path |
| 4.1-4.3 | Verification commands | Static/full suite | N/A | N/A | ✅ All local gates passed | N/A | ✅ Fixed Biome formatting after check feedback |

## Test Summary

- **Total tests written**: 5 assertions across 4 test files.
- **Total tests passing**: 102/102 in the full suite.
- **Layers used**: Unit/config/docs and component integration.
- **Approval tests**: None — no behavior-preserving refactor tasks.
- **Pure functions created**: 0 — changes are declarative config/UI props/docs.

## Verification

- ✅ `bun run test amplify/backend.test.ts`
- ✅ `bun run test app/login/login-view.test.tsx`
- ✅ `bun run test amplify/auth/resource.test.ts`
- ✅ `bun run test docs/amplify-sandbox-smoke.test.ts`
- ✅ `bun run test amplify/backend.test.ts amplify/auth/resource.test.ts app/login/login-view.test.tsx docs/amplify-sandbox-smoke.test.ts`
- ✅ `bunx tsc --noEmit`
- ✅ `bun run check -- --max-diagnostics=200`
- ✅ `bun run test` — 33 files, 102 tests passed
- ✅ `bun run verify:amplify-config`
- ⏭️ `npx ampx sandbox` manual smoke not run per apply instructions; requires Node LTS via `nvm use`.

## Deviations from Design

None — implementation matches the design. Invitation copy was included because installed Amplify types expose `loginWith.email.userInvitation.emailSubject/emailBody` with the required placeholder callback contract.

## Issues Found

- Context7 documentation lookup was unavailable due monthly quota exhaustion, so docs support for invitation copy was verified from installed package types at `node_modules/@aws-amplify/auth-construct/lib/types.d.ts`.
- Manual Cognito enforcement still requires sandbox redeploy smoke evidence under Node LTS.

## Workload / PR Boundary

- Mode: single PR
- Current work unit: Invite-only backend + UI + docs
- Boundary: User Pool enforcement, login UI sign-up suppression, invitation copy, tests, and smoke docs.
- Estimated review budget impact: Low, consistent with tasks forecast.

## Status

11/12 tasks complete. Local implementation is ready for SDD verify; remaining task is manual sandbox smoke evidence.
