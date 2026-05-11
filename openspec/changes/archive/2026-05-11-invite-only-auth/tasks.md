# Tasks: Invite-Only Auth

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~80–110 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | none |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: none
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Invite-only backend + UI + docs | PR 1 | Single cohesive change; tests included |

## Phase 1: Backend Enforcement (TDD)

- [x] 1.1 Create `amplify/backend.test.ts` — mock `defineBackend` and assert `cfnUserPool.adminCreateUserConfig.allowAdminCreateUserOnly` is `true` (RED).
- [x] 1.2 Modify `amplify/backend.ts` — capture `defineBackend()` return and set `backend.auth.resources.cfnResources.cfnUserPool.adminCreateUserConfig = { allowAdminCreateUserOnly: true }` (GREEN).
- [x] 1.3 Run `bun run test amplify/backend.test.ts` to confirm.

## Phase 2: Login UI Suppression (TDD)

- [x] 2.1 Create `app/login/login-view.test.tsx` — mock `Authenticator` and assert `hideSignUp` is passed alongside `initialState="signIn"` and `loginMechanisms={["email"]}` (RED).
- [x] 2.2 Modify `app/login/login-view.tsx` — add `hideSignUp` to `Authenticator` without changing other props or redirect behavior (GREEN).
- [x] 2.3 Run `bun run test app/login/login-view.test.tsx` to confirm.

## Phase 3: Optional Invitation Copy & Smoke Docs

- [x] 3.1 Optionally modify `amplify/auth/resource.ts` — add `loginWith.email.userInvitation` with `emailSubject` and `emailBody(username, code)` preserving Cognito placeholder callbacks.
- [x] 3.2 Modify `docs/amplify-sandbox-smoke.md` — replace the public create-account smoke path with admin-created user creation, temporary-password first sign-in, and a blocked public sign-up check.

## Phase 4: Static Gates & Verification

- [x] 4.1 Run `bunx tsc --noEmit` and `bun run check -- --max-diagnostics=200`.
- [x] 4.2 Run `bun run test`.
- [x] 4.3 Run `bun run verify:amplify-config` if `amplify_outputs.json` exists.
- [ ] 4.4 Under Node LTS (`nvm use`), run `npx ampx sandbox`; create an admin-invited user, complete first sign-in, and confirm direct public `SignUp` is rejected.
