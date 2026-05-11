# Amplify Sandbox Smoke Checklist

Run this before archive/release. Local tests prove adapter wiring and fail-fast checks, but they do not prove Cognito/AppSync/S3 policy behavior.

## Required setup

1. Switch to the pinned Node.js LTS runtime: `nvm use` (reads root `.nvmrc`, currently Node 22).
2. Run the Amplify CLI with Node LTS and npm, not Bun: `npx ampx sandbox` or deploy the Amplify backend.
   - Do not use `bunx ampx ...`; Amplify CLI package-manager detection rejects Bun.
   - Avoid non-LTS Node runtimes for the CLI; Node v25.9.0 failed before sandbox startup in local smoke.
   - Keep the app's direct `zod` dependency pinned to `3.25.17`. `@aws-amplify/backend-output-schemas@1.8.0` declares that exact peer and its output-generation schema parsing can fail under Zod 4 record semantics after a successful sandbox deploy.
3. Replace the placeholder root `amplify_outputs.json` with the generated file.
4. Run `bun run verify:amplify-config` and confirm Auth, Data, and Storage sections are present.
5. Run the normal local gates without a production build: `bunx tsc --noEmit`, `bun run check -- --max-diagnostics=200`, `bun run test`.

## Creating invited users

For one-off manual setup, create users in the AWS Cognito console for the User Pool listed in `amplify_outputs.json` at `auth.user_pool_id`.

For repeatable team setup, use the repo script:

```bash
bun run auth:create-user user@example.com --dry-run
bun run auth:create-user user@example.com --yes
```

The script reads `auth.aws_region` and `auth.user_pool_id` from `amplify_outputs.json`, calls Cognito `AdminCreateUser`, and lets Cognito generate and email the temporary password. Do not print or share temporary passwords manually. If the invitation needs to be resent, run:

```bash
bun run auth:create-user user@example.com --resend --yes
```

The caller's AWS credentials must have least-privilege access to `cognito-idp:AdminCreateUser` for this sandbox/deployed User Pool.

Minimal IAM policy shape:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["cognito-idp:AdminCreateUser"],
      "Resource": "arn:aws:cognito-idp:<region>:<account-id>:userpool/<user-pool-id>"
    }
  ]
}
```

## Manual smoke scenarios

- Auth entry: create or obtain an admin-created user in the Cognito User Pool, then open `/login` and sign in with the invited user's temporary password. Complete the first sign-in prompts, set a permanent password if Cognito requires it, and confirm authenticated users are redirected into `/`.
- Invite-only enforcement: confirm `/login` does not show create-account or sign-up controls, then attempt a direct Cognito SignUp against the sandbox app client and confirm public self-registration is rejected because admin-created users only are allowed.
- Auth ownership: sign in as User A and User B; confirm each user only sees and mutates their own threads.
- Data graph: create a session with a transcript attachment and generated output metadata; confirm owner, session, source message, file, and output records are traceable in Amplify Data.
- Storage privacy: upload as User A, confirm the object key is nested under `private/<identityId>/sessions/...`, confirm User A can retrieve it, and confirm User B cannot retrieve User A's private object. The backend access rule must stay `private/{entity_id}/*`; Amplify Gen 2 rejects `private/{entity_id}/sessions/*`.
- Chat route: submit to `/api/chat`, confirm progressive streaming and persisted final state.
- Court Reporter safety: ask for certified/final wording and confirm the assistant frames output as draft assistance requiring human review.

Do not mark the change release-ready until these sandbox checks have real evidence.
