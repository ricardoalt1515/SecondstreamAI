# SecondstreamAI

An AI chat application built with [Next.js](https://nextjs.org), [Amplify Gen 2](https://docs.amplify.aws), [Mastra](https://mastra.ai), AI SDK, and React 19.

## Features

- Court Reporter draft-assistance chat workflow with human-review safety boundaries
- Conversational AI assistant with working memory that persists across threads
- Authenticated thread, message, file, and output metadata backed by Amplify Gen 2
- Private attachment storage through Amplify Storage, with explicit S3 rollback fallback
- Thread management: create, list, delete, and branch conversations
- Dark/light theme support

## Getting Started

### Prerequisites

- [Bun](https://bun.sh)
- Node.js 22 LTS for Amplify CLI commands (`.nvmrc` pins this; run `nvm use` before sandbox/deploy commands)
- AWS credentials with access to Amazon Bedrock in `AWS_REGION`
- Amplify Gen 2 sandbox or deployment outputs for Auth, Data, and Storage

### Setup

```bash
bun install
cp .env.example .env
```

Start an Amplify sandbox or deploy the backend, then copy the generated outputs file into the project root:

```bash
nvm use
npx ampx sandbox
```

Use Bun for app scripts (`bun run dev`, `bun run test`, `bun run check`). Use Node 22 LTS for Amplify CLI commands; the official sandbox command is `npx ampx sandbox`, and non-LTS Node versions may fail before the sandbox starts.

The app intentionally keeps the checked-in `amplify_outputs.json` as a placeholder. Before release verification, replace it with the generated file and run:

```bash
bun run verify:amplify-config
```

Fill in the required AWS/Bedrock values in `.env`:

```dotenv
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
# AWS_SESSION_TOKEN=your-aws-session-token
```

### Development

```bash
bun run dev
```

Opens the app at [http://localhost:3000](http://localhost:3000).

### Build

```bash
bun run build
```

### Test

```bash
bun run test
```

### Lint & Format

```bash
bun run lint
bun run format
bun run check
```

## Tech Stack

- **Framework**: Next.js App Router (React 19, TanStack Query)
- **Backend**: Amplify Gen 2 Auth, Data, and Storage
- **AI**: Vercel AI SDK `ToolLoopAgent` with Amazon Bedrock
- **Styling**: Tailwind CSS v4, Shadcn UI
- **Tooling**: Next.js, TypeScript, Bun, Biome, Vitest

## Runtime Configuration

- Default chat metadata store: Amplify Data.
- Optional local fallback: set `CHAT_STORE_RUNTIME=libsql` and optionally `CHAT_STORE_DATABASE_URL=file:./mastra.db`.
- Default attachment blob store: Amplify Storage with the Gen 2-valid `private/{entity_id}/*` access rule and nested per-session keys under `private/<identityId>/sessions/...`.
- Optional rollback fallback: set `CHAT_BLOB_STORE_RUNTIME=s3` and provide `CHAT_ATTACHMENTS_S3_BUCKET` / `CHAT_ATTACHMENTS_S3_PREFIX`.
- `amplify_outputs.json` must include `auth`, `data`, and `storage` sections before production smoke or release.

See `docs/amplify-sandbox-smoke.md` for the sandbox smoke checklist that cannot be proven from local mocks alone.

## License

[MIT](LICENSE)
