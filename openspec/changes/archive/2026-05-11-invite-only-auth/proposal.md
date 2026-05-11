# Proposal: Invite-Only Auth

## Intent

Make SecondstreamAI login invite-only so only admin-created Cognito users can access the app. Public self-registration must be blocked at the User Pool level, not only hidden in the UI.

## Scope

### In Scope
- Disable Cognito self sign-up via Amplify Gen 2 CDK override.
- Hide sign-up in the Amplify UI `Authenticator`.
- Optionally customize admin-created user invitation email copy.
- Update sandbox smoke docs for admin-created user validation.

### Out of Scope
- Invite-code flows, approval queues, or custom pre-signup Lambda triggers.
- Payment gating, tenant administration UI, or user lifecycle dashboards.
- Bypassing Cognito/Auth ownership rules.

## Capabilities

### New Capabilities
- `invite-only-auth`: Defines admin-created account access, disabled public self sign-up, UI sign-up suppression, and sandbox validation expectations.

### Modified Capabilities
- None; no existing OpenSpec specs were present.

## Approach

Use the exploration recommendation: enforce invite-only access in Cognito with a CDK escape hatch in `amplify/backend.ts`, because Amplify Gen 2 `defineAuth` currently hardcodes self sign-up enabled and does not expose a first-class prop. Add `hideSignUp` to the login `Authenticator` so users only see sign-in. If desired, configure `loginWith.email.userInvitation` in `amplify/auth/resource.ts` for product-specific temporary-password invitation copy. Update smoke docs to require admin-created users and verify public sign-up is unavailable.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `amplify/backend.ts` | Modified | Add User Pool `AdminCreateUserConfig.AllowAdminCreateUserOnly=true` override. |
| `amplify/auth/resource.ts` | Modified | Optional invitation email subject/body configuration. |
| `app/login/login-view.tsx` | Modified | Hide sign-up in Amplify UI Authenticator. |
| `docs/amplify-sandbox-smoke.md` | Modified | Document admin-created user smoke flow and blocked self sign-up check. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| UI-only hiding mistaken for enforcement | Low | Spec requires backend User Pool enforcement. |
| CDK override path changes in Amplify | Med | Verify with sandbox deploy and generated outputs. |
| Admin invite email copy breaks temporary-password flow | Low | Keep Cognito placeholders and smoke-test first login. |

## Rollback Plan

Remove the CDK override, remove `hideSignUp`, and revert smoke-doc changes. Re-run `npx ampx sandbox` under Node LTS and validate self sign-up returns to the prior behavior.

## Dependencies

- Amplify Gen 2 backend deployment/sandbox with Node LTS: `npx ampx sandbox`.
- Cognito admin user creation via AWS Console or CLI.

## Success Criteria

- [ ] Cognito rejects public `SignUp` for the app client.
- [ ] `/login` shows sign-in only, with no create-account path.
- [ ] Admin-created user receives temporary-password invite and completes first sign-in.
- [ ] Smoke docs explain the admin-created user validation path.
