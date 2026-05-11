# Design: Invite-Only Auth

## Technical Approach

Enforce invite-only access in Cognito, then mirror that rule in the login UI. The backend change uses Amplify Gen 2's generated auth L1 resources from `defineBackend()` and sets the Cognito User Pool `AdminCreateUserConfig.AllowAdminCreateUserOnly` flag to `true`. The UI change adds `hideSignUp` to the existing Amplify UI `Authenticator` so `/login` no longer advertises self-service registration. This satisfies the spec requirement that UI hiding is only a UX complement, not the security boundary.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Backend enforcement | Override `backend.auth.resources.cfnResources.cfnUserPool.adminCreateUserConfig` in `amplify/backend.ts` with `allowAdminCreateUserOnly: true`. | Pre-signup Lambda rejection; UI-only hiding. | Cognito owns registration, so the User Pool must reject direct `SignUp`. A Lambda is more moving parts; UI-only hiding is not security. |
| Login UX | Add `hideSignUp` to the current `Authenticator` in `app/login/login-view.tsx`. | Custom auth form; leave sign-up visible and rely on Cognito rejection. | Existing Amplify UI wiring remains intact for first sign-in and redirects, while removing the misleading create-account path. |
| Invitation copy | Customize `loginWith.email.userInvitation` only with Cognito placeholder callbacks preserved. | Skip email customization; custom invitation service. | Low-risk product clarity is useful, but Cognito placeholders for username and temporary password must stay intact. No custom lifecycle system is in scope. |
| Verification | Prefer static/unit checks for config shape plus login render tests, then sandbox smoke. | Production build; live-only manual validation. | Project standards forbid production build here. Unit tests catch regressions cheaply; sandbox proves Cognito behavior. |

## Data Flow

```text
Admin creates Cognito user
        │
        ▼
Cognito sends temporary-password invite
        │
        ▼
/login Authenticator (sign-in only, no sign-up UI)
        │
        ▼
Amplify Auth session ──→ existing route protection and owner-scoped data

Direct public SignUp ──→ Cognito User Pool rejects
```

## File Changes

| File | Action | Description |
|---|---|---|
| `amplify/backend.ts` | Modify | Capture `defineBackend(...)` return value and override the generated Cognito User Pool admin-create-user config. |
| `amplify/auth/resource.ts` | Modify | Keep email login; optionally add `userInvitation.emailSubject` and `emailBody(username, code)` copy. |
| `app/login/login-view.tsx` | Modify | Add `hideSignUp` to `Authenticator`; keep `initialState="signIn"`, email login, and redirect behavior. |
| `docs/amplify-sandbox-smoke.md` | Modify | Replace create-account smoke path with admin-created invited-user flow and blocked public sign-up validation. |
| `amplify/backend.test.ts` or auth config test | Create | Assert the backend applies `allowAdminCreateUserOnly: true` without deploying. |
| `app/login/login-view.test.tsx` or extend `app/login/page.test.tsx` | Create/Modify | Mock `Authenticator` and assert `hideSignUp` is passed. |

## Interfaces / Contracts

Implementation should use the existing Amplify Gen 2 resource shape:

```ts
const backend = defineBackend({ auth, data, storage });
backend.auth.resources.cfnResources.cfnUserPool.adminCreateUserConfig = {
  allowAdminCreateUserOnly: true,
};
```

Invitation copy, if added, must preserve both callback values:

```ts
userInvitation: {
  emailBody: (username, code) => `...${username()}...${code()}...`,
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit/config | Cognito User Pool receives `allowAdminCreateUserOnly: true`. | Mock `defineBackend`/auth resources or inspect exported config via Vitest. |
| UI | Login view hides public sign-up and remains sign-in first. | Mock `@aws-amplify/ui-react` `Authenticator`; assert `hideSignUp`, `initialState`, and email mechanism props. |
| Static gates | Type and formatting safety. | Run `bunx tsc --noEmit`, `bun run check -- --max-diagnostics=200`, `bun run test`, and `bun run verify:amplify-config` when outputs exist. |
| Sandbox smoke | Real Cognito invite-only behavior. | Under Node LTS run `nvm use` then `npx ampx sandbox`; create/admin-invite a user, complete first sign-in, and verify direct public sign-up is rejected. |

## Migration / Rollout

No data migration required. Existing confirmed users should continue signing in. New users must be created by an admin after deployment. Rollback removes the User Pool override, `hideSignUp`, invitation copy, and smoke-doc updates, then redeploys sandbox with Node LTS.

## Open Questions

- [ ] None blocking.
