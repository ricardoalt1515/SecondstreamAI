# invite-only-auth Specification

## Purpose

Define invite-only authentication behavior for SecondstreamAI so access is limited to admin-created Cognito users without weakening existing auth ownership or route protection.

## Requirements

### Requirement: Cognito Invite-Only Enforcement

The system MUST disable public self-registration at the Cognito User Pool level. Public sign-up MUST NOT remain available solely because the UI hides sign-up controls.

#### Scenario: Public sign-up is rejected by Cognito

- GIVEN the deployed app client is configured for invite-only access
- WHEN an unauthenticated actor attempts a direct Cognito `SignUp`
- THEN Cognito rejects the request because admin-created users only are allowed

### Requirement: Login UI Has No Public Sign-Up Path

The `/login` experience MUST remain usable for admin-created or invited users and MUST NOT show public account-creation entry points.

#### Scenario: Invited user can sign in from login page

- GIVEN an admin-created user has valid first-login credentials
- WHEN that user opens `/login`
- THEN the page presents sign-in controls needed to authenticate successfully

#### Scenario: Public sign-up controls are absent

- GIVEN an unauthenticated visitor opens `/login`
- WHEN the authentication UI renders
- THEN no self-service sign-up link, tab, or create-account action is shown

### Requirement: Admin Invitation Flow Clarity

If invitation email content is customized, the system SHOULD preserve a clear admin-created user flow, including temporary-password expectations and first-sign-in guidance, without breaking Cognito-required placeholders.

#### Scenario: Customized invitation stays usable

- GIVEN invitation email copy is customized for admin-created users
- WHEN Cognito sends the invitation
- THEN the message clearly explains the temporary-password flow and remains valid for first sign-in

### Requirement: Smoke Validation Covers Invited Users

The sandbox smoke documentation MUST explain how to create or obtain an invited/admin-created test user, how to complete first sign-in, and how to verify that public self-registration is unavailable.

#### Scenario: Smoke checklist covers invite-only auth

- GIVEN an engineer follows the sandbox smoke document
- WHEN they validate authentication in sandbox
- THEN they can execute an invited-user login flow and a blocked public-sign-up check from the documented steps

### Requirement: Existing Auth Protections Stay Intact

The system MUST preserve existing auth ownership behavior and route protection while making sign-in invite-only.

#### Scenario: Invite-only change does not weaken access control

- GIVEN protected workspace routes and owner-scoped records already require authenticated access
- WHEN invite-only auth is enabled
- THEN authenticated users still access only their own protected resources and unauthenticated users still cannot reach protected app routes
