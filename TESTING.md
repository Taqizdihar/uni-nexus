# Testing UNI-NEXUS

This repository is an npm workspaces monorepo. Run commands from the repository root.

## Prerequisites

- Node.js 22.12 or newer
- Installed npm dependencies
- A development MySQL-compatible database containing the project's existing schema

Initialize local environment files without overwriting existing configuration:

```bash
npm run env:init
```

The API reads `apps/api/.env`; the admin app reads `apps/admin/.env`. Keep credentials
out of the repository and configure them through the environment.

## Automated checks

Run the complete test suite:

```bash
npm test
```

Run the other repository checks:

```bash
npm run typecheck
npm run lint
npm run build
```

`npm run format:check` is an optional formatting check.

The API tests use Vitest and include unit, service, router, and application checks. Tests
that exercise database-backed behavior require a reachable development database.

## Local smoke test

Start the shared package watcher, API, and admin app together:

```bash
npm run dev
```

Then verify the API readiness endpoint and the frontend:

```bash
curl --fail http://127.0.0.1:3000/api/health/ready
curl --fail http://127.0.0.1:5173/
```

The API should report a connected database. The frontend is served at
`http://127.0.0.1:5173`; its Vite proxy forwards `/api` requests to the API.

## Database safety

The live database is authoritative. Do not run destructive resets or drops. `npm run
db:generate` only regenerates the Prisma client; `npm run db:pull` reads the live schema
and rewrites the checked-in Prisma schema, so run it only deliberately and review its
diff before keeping the result.
