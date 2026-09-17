# UNI-NEXUS

UNI-NEXUS is an internal operations workspace for a 3D printing business. It tracks the
full workflow of the business — from a customer's custom request, through design, quoting,
ordering, production, printing, quality control, packaging and delivery — in one connected
system, alongside supporting modules for materials, printers, experiments, costing and
audit history.

This is a foundation, not a finished product: the schema and API cover the full workflow,
and the admin app renders every module through a generic, metadata-driven resource engine.

See also: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/MODULES.md](docs/MODULES.md),
[docs/DATABASE.md](docs/DATABASE.md).

## Technology stack

**Frontend** (`apps/admin`) — React 19, Vite, TypeScript, Tailwind CSS v4, React Router,
TanStack Query, React Hook Form + Zod, Lucide React icons.

**Backend** (`apps/api`) — Node.js, TypeScript, Express, Prisma ORM (MariaDB driver
adapter), MySQL, Zod, bcrypt, JWT stored in an HttpOnly cookie.

**Database** — MySQL, database name `uni-nexus_db`.

**Shared** (`packages/shared`) — TypeScript types and generated resource metadata shared
between the frontend and backend.

## Repository structure

```text
UNI-NEXUS/
├── apps/
│   ├── admin/          React + Vite frontend (the operations workspace UI)
│   └── api/             Express + Prisma backend API
├── packages/
│   └── shared/          Shared TypeScript types + generated resource metadata
├── docs/                 Architecture, module and database documentation
├── scripts/               Repo-level helper scripts (env init, resource generation)
├── package.json           npm workspaces root
└── ...
```

This is an npm workspaces monorepo. Always run npm commands from the repository root
unless a section below says otherwise.

## Prerequisites

- **Node.js 22.12+** and npm (bundled with Node).
- **Laragon** (or any local MySQL 8-compatible server) running on Windows, with MySQL
  listening on `127.0.0.1:3306`.
- **phpMyAdmin** (bundled with Laragon) is convenient for inspecting the database, but is
  not required.
- A MySQL database named `uni-nexus_db` with the project's schema already created. This
  project does not create or migrate the schema — see
  [Database safety](#database-safety) below.

## Laragon / MySQL setup

1. Start Laragon and make sure MySQL is running (Laragon's "Start All" button, or start
   MySQL individually). Confirm it is listening on `127.0.0.1:3306`.
2. Using phpMyAdmin or the MySQL CLI, make sure a database named `uni-nexus_db` exists
   with the expected schema. The default local credentials are user `root` with an empty
   password, matching Laragon's defaults.
3. Leave MySQL running for the rest of these steps — the API will not start successfully
   without a reachable database (`DATABASE_URL` in `apps/api/.env` must be able to
   connect).

## Environment initialization

Copy the example environment files and generate a local JWT secret:

```bash
npm run env:init
```

This runs [scripts/init-env.mjs](scripts/init-env.mjs), which creates `apps/api/.env` and
`apps/admin/.env` from their `.env.example` files **only if they do not already exist** —
it never overwrites a developer's existing local configuration, and it generates a random
`JWT_SECRET` for a freshly created `apps/api/.env`.

Review the generated `apps/api/.env`. For a typical Laragon setup, the defaults already
match:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL="mysql://root:@127.0.0.1:3306/uni-nexus_db"
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
ALLOW_PUBLIC_SIGNUP=true
STORAGE_DRIVER=local
```

`apps/admin/.env` only needs `VITE_API_URL` — leave it **empty** for local development so
the frontend calls the Vite dev proxy (`/api/*` → `http://127.0.0.1:3000`) instead of an
absolute URL:

```env
VITE_API_URL=
```

`.env` files are git-ignored and never committed; only the `.env.example` files are
tracked.

## Install dependencies

From the repository root:

```bash
npm install
```

This installs and links all three workspace packages: `@uni-nexus/admin`,
`@uni-nexus/api`, and `@uni-nexus/shared`. The API's `postinstall` script also runs
`prisma generate` automatically.

> **Windows note:** npm has a long-standing bug with optional, platform-specific native
> dependencies (npm/cli#4828). This repository pins the Windows x64 native bindings that
> `vite`/`rolldown` and `@tailwindcss/vite`/`lightningcss` need
> (`@rolldown/binding-win32-x64-msvc`, `lightningcss-win32-x64-msvc`) as explicit
> `optionalDependencies` in `apps/admin/package.json` so a plain `npm install` resolves
> them reliably on Windows. They are skipped automatically on other platforms.

## Generate the Prisma client

```bash
npm run db:generate
```

This runs `prisma generate` for `@uni-nexus/api`, reading `apps/api/prisma/schema.prisma`
and producing the typed Prisma client the API imports. It requires no live database
connection.

## Running the app

### Everything together (recommended)

From the repository root, with MySQL running:

```bash
npm run dev
```

This builds `@uni-nexus/shared` once, then runs the shared package's watcher, the API,
and the admin frontend concurrently. Open:

- Frontend: **http://127.0.0.1:5173**
- API: **http://localhost:3000**

### Frontend and backend separately

```bash
npm run dev -w @uni-nexus/api      # http://localhost:3000
npm run dev -w @uni-nexus/admin    # http://127.0.0.1:5173
```

The Vite dev server proxies `/api/*` requests to `http://127.0.0.1:3000`, so the browser
only ever talks to the frontend origin — no CORS or cookie configuration is needed in
development as long as `VITE_API_URL` is left empty.

## First-run setup

The database starts with no users. On first visit, the app detects this and walks you
through creating the first account:

1. `GET /api/v1/setup/status` reports `setupRequired: true`.
2. The frontend redirects to `/setup`.
3. Submit your full name, email, password, and a workspace name.
4. The API creates the first user (with the `OWNER` role), a workspace, and the
   membership linking them, all in one transaction, and signs you in.
5. You land on `/app/dashboard`.

Subsequent visitors either sign in at `/login`, or — if `ALLOW_PUBLIC_SIGNUP=true` — can
self-register at `/signup`. A self-registered account has no workspace access until an
existing owner/CEO/admin adds them from **Settings → Members**.

## Testing

```bash
npm run test
```

Runs the API's Vitest suite (`apps/api/src/**/*.test.ts`) against your local MySQL
database — it needs Laragon/MySQL running. Tests exercise auth, workspace membership,
the generic resource CRUD engine, costing/HPP calculations, money formatting, and file
storage validation.

## Type checking, linting, formatting

```bash
npm run typecheck   # tsc --noEmit across all workspaces
npm run lint         # eslint .
npm run format:check # prettier --check . (report only; not part of the required gate)
```

## Production build

```bash
npm run build
```

Builds `@uni-nexus/shared`, then `@uni-nexus/api` (TypeScript → `apps/api/dist`), then
`@uni-nexus/admin` (`tsc --noEmit` + `vite build` → `apps/admin/dist`).

To run the built API: `npm run start -w @uni-nexus/api` (serves `dist/server.js`, reading
the same `apps/api/.env`). The built admin app in `apps/admin/dist` is static and can be
served by any static file host or reverse proxy in front of the API.

## Database safety

`uni-nexus_db` is the source of truth. This project only ever **reads** the schema:

- Never run `prisma migrate reset`, `prisma db push --force-reset`, `DROP DATABASE`, or
  `DROP TABLE` against it.
- `npm run db:pull` re-introspects the live schema into `apps/api/prisma/schema.prisma`.
  Only run it deliberately, after reviewing the diff — it can rewrite relation names and
  is not run automatically by any other script.
- `npm run db:generate` (safe, no database write) regenerates the Prisma client from the
  schema file already on disk.

See [docs/DATABASE.md](docs/DATABASE.md) for the full data-safety model.

## Deployment direction

This repository targets local development against Laragon/MySQL. A production
deployment would run the built API (`apps/api/dist/server.js`) behind a process manager
and reverse proxy, serve `apps/admin/dist` as static files (or from a CDN), point
`DATABASE_URL` at a managed MySQL instance, and set `NODE_ENV=production` with an
explicit `JWT_SECRET` and HTTPS-only `CORS_ORIGINS`/`FRONTEND_URL` (required by
`apps/api/src/config/env.ts`). No specific hosting provider is wired up — that is a
later phase.
