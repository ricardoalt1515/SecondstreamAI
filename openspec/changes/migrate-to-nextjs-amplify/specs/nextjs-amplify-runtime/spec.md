# nextjs-amplify-runtime Specification

## Purpose

Define the production MVP behavior for moving the app to Next.js App Router with Amplify Gen 2 while preserving the current AI chat experience.

## Requirements

### Requirement: Next.js App Runtime

The system MUST replace TanStack Start/Vite routes with Next.js App Router pages, layouts, Route Handlers, and Server Actions. The migrated app MUST preserve the root workspace, thread workspace, and chat POST entrypoint behavior. Initial workspace data loading SHOULD be server-first.

#### Scenario: Route parity is preserved

- GIVEN an authenticated user opens the app root or a thread URL
- WHEN the App Router renders the request
- THEN the user sees the same workspace capabilities without TanStack route dependencies

### Requirement: Amplify Auth Identity

The system MUST require Amplify Auth backed by Cognito for persisted user actions. Threads, messages, files, outputs, and working memory MUST resolve ownership from the authenticated identity, and the runtime MUST NOT rely on a hardcoded shared user id.

#### Scenario: Ownership comes from auth

- GIVEN two authenticated users
- WHEN each user loads sessions or submits chat work
- THEN each user can read and mutate only records owned by that identity

### Requirement: Amplify Data Ownership Model

The system MUST define Amplify Gen 2 Data models for User, AgentConfig, Session, Message, File, and GeneratedOutput, including ownership fields needed to link user, session, message, file, and output records. The model MUST support Court Reporter MVP persistence and reuse by future agents.

#### Scenario: Session graph is representable

- GIVEN a user sends a message with an attachment and later receives a generated output
- WHEN metadata is persisted
- THEN the backend can trace the output back to its owner, session, source message, and stored file records

### Requirement: Amplify Storage Ownership

The system MUST store uploaded files and generated outputs through Amplify-managed storage policies. Stored objects MUST be private by default, MUST remain associated with owner and session metadata, and MUST support secure retrieval for chat intake and download flows.

#### Scenario: Files stay private and usable

- GIVEN a user uploads a transcript and later downloads a generated artifact
- WHEN storage access is evaluated
- THEN the owner can access the object and unrelated users cannot

### Requirement: Streaming Chat Preservation

The system MUST preserve the AI SDK streaming chat contract on Next.js Route Handlers and Amazon Bedrock. Message validation, attachment limits, persisted-history replay, regeneration behavior, and generated-title updates MUST remain functionally equivalent to the current chat loop.

#### Scenario: Streaming behavior survives migration

- GIVEN a valid chat request with supported attachments
- WHEN the user submits it to the Next.js chat endpoint
- THEN streamed assistant updates arrive progressively and the resulting thread state is persisted correctly

### Requirement: Court Reporter MVP Readiness

The system MUST support the Court Reporter MVP flow: authenticated workspace access, session persistence, transcript-friendly file intake, AI draft/review responses, and downloadable output metadata. Assistant responses MUST present output as draft assistance and MUST NOT imply certification authority.

#### Scenario: Court reporter completes the core flow

- GIVEN an authenticated court reporter uploads transcript material with instructions
- WHEN the assistant returns draft content or output metadata
- THEN the workflow preserves human review responsibility and keeps the session reusable later

### Requirement: Configuration and Verification

The system MUST define a documented Bun-based environment contract for Next.js, Amplify outputs, Bedrock, and storage settings, and MUST fail fast on invalid configuration. Verification MUST cover route parity, auth ownership, file constraints, chat streaming, and persistence regressions.

#### Scenario: Misconfiguration is caught before release

- GIVEN a deployment is missing required Amplify or storage configuration
- WHEN verification or app startup runs
- THEN the failure is explicit before production traffic is accepted
