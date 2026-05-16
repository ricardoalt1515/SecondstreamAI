# h2o-downloadable-artifacts Specification

## Purpose

Define durable behavior for H2O PDF artifact generation, persistence, and authenticated downloads.

## Requirements

### Requirement: Lambda-Safe Filesystem Agent Skills

The system MUST keep H2O Agent Skills as filesystem-backed `src/ai/skills/<name>/SKILL.md` packages and MUST make them available to the `chat-streaming` Lambda runtime.

#### Scenario: Lambda can load a packaged H2O skill

- GIVEN the chat-streaming Lambda bundle is built
- WHEN `loadSkill` is executed for a valid H2O skill name
- THEN it loads the corresponding `SKILL.md` content from the packaged skills directory
- AND it strips frontmatter from the returned content
- AND it returns `loaded: true`

#### Scenario: Unsafe skill name is rejected

- GIVEN `loadSkill` receives a name containing path traversal or path separators
- WHEN the tool validates the name
- THEN the request is rejected or returns `loaded: false`
- AND no filesystem path outside the packaged skills directory is read

### Requirement: PDF-First Artifact Tool Surface

The system MUST expose artifact generation tools that produce real PDF artifact outputs for: Field Brief, Playbook, Analytical Read, and Proposal Shell. The tools MUST validate typed structured payloads and MUST NOT treat Markdown as the primary artifact deliverable.

#### Scenario: Tool returns PDF format

- GIVEN an authenticated chat turn invokes an artifact tool with valid structured input
- WHEN the tool succeeds
- THEN the artifact payload is persisted
- AND the tool result includes a PDF download URL for that artifact kind
- AND the tool result does not claim PDF support unless the PDF route can return a real PDF

### Requirement: Structured Payload Source of Truth

The system MUST persist a structured artifact payload keyed by owner, thread, and artifact kind. PDF rendering MUST consume that typed payload directly. The model MUST NOT provide arbitrary Markdown as the canonical artifact body.

#### Scenario: Payload drives PDF rendering

- GIVEN a ready Field Brief artifact payload exists
- WHEN the owner requests the Field Brief PDF
- THEN the PDF renderer receives the typed Field Brief payload
- AND returns a PDF document derived from that payload

### Requirement: Regenerate Replaces Active Artifact Payload

A regenerate action for the same owner, thread, and artifact kind MUST replace the previous active ready payload. Failed attempts MUST NOT become the active downloadable artifact.

#### Scenario: Regenerate replaces active artifact

- GIVEN an existing ready Field Brief artifact for an owner and thread
- WHEN `generateFieldBrief` succeeds again for that same owner and thread
- THEN the newly generated payload becomes the active artifact
- AND the PDF route renders from the regenerated payload

#### Scenario: Failed generation is not downloadable

- GIVEN an artifact generation attempt fails or records status `failed`
- WHEN the owner requests the artifact PDF
- THEN the failed payload is not returned as the active downloadable artifact

### Requirement: Authenticated PDF Download Routes

The system MUST provide owner-checked PDF download routes by thread and artifact kind:

```text
GET /api/threads/[threadId]/artifacts/[kind]/pdf
```

A requester MUST be authenticated and MUST match ownership for the thread/artifact context; otherwise access MUST be denied.

#### Scenario: Owner can download PDF

- GIVEN an authenticated owner has a ready artifact payload for a thread and kind
- WHEN the owner calls the PDF route
- THEN the route returns `application/pdf`
- AND includes attachment disposition with a deterministic filename
- AND includes private/no-store cache behavior unless a later caching strategy is explicitly approved

#### Scenario: Non-owner download is denied

- GIVEN an authenticated user who does not own the thread artifact
- WHEN they call the artifact PDF route
- THEN the request is denied with owner-safe behavior

### Requirement: Four-PDF Package Behavior

Opportunity-advancing turns SHOULD produce a PDF artifact package containing the Field Brief, Playbook, Analytical Read, and Proposal Shell, with the Field Brief presented first. If implementation keeps one tool per artifact, the agent MUST be guided to call all four tools for package-generating turns. Conversational turns MUST NOT generate artifacts.

#### Scenario: Attachment triggers four-PDF package

- GIVEN an authenticated chat turn includes an attachment with opportunity context
- WHEN artifact tools are available
- THEN artifact generation is requested for all four PDF artifact kinds
- AND Field Brief is prioritized first in presentation

#### Scenario: Focused conversational turn produces no artifact

- GIVEN a conversational turn has no attachment and no artifact/package trigger phrase
- WHEN the assistant responds
- THEN no artifact generation tool is executed
- AND normal chat response behavior continues

### Requirement: H2O Brand PDF Fidelity

PDF content and layout MUST align to the H2O v3 branding reference in `H2O Allegiant Discovery Agent v3/h2o-allegiant-brand-brand.py` and related reference files, while implementation MUST be delivered in TypeScript/Next.js and MUST NOT require ReportLab runtime coupling.

#### Scenario: Implementation stays in TS/Next boundary

- GIVEN artifact generation and download capability is implemented
- WHEN runtime dependencies are evaluated
- THEN delivery uses TypeScript/Next.js paths
- AND ReportLab is not required for production artifact generation or delivery

#### Scenario: Field Brief contains required PDF structure

- GIVEN a Field Brief PDF is rendered
- WHEN the PDF is inspected structurally
- THEN it includes a cover/header block, stage badge, four fixed sections, insight boxes, cost-of-alternative table, kill-risk cards, action cards, and footer/page treatment consistent with the v3 reference intent

### Requirement: Non-Goals Are Out of Scope for V1

V1 MUST NOT require an artifact preview panel, section-by-section streaming, transient artifact update events, full Knowledge Base injection, or Markdown-primary artifact delivery.

#### Scenario: Out-of-scope features are not required for acceptance

- GIVEN V1 acceptance is evaluated
- WHEN implementation lacks preview panel, section streaming, transient updates, full KB injection, or Markdown primary output
- THEN the change remains compliant if the four PDF artifacts can be generated and downloaded securely
