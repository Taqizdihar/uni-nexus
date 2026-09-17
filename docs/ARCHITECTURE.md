# Architecture

UNI-NEXUS is a modular monolith: one Express API, one MySQL database, one React
frontend, organized as an npm workspaces monorepo. There is no microservice split, no
message queue, and no separate BFF layer — by design, for this stage of the project.

```text
┌─────────────────────────┐        ┌───────────────────────────┐        ┌──────────────┐
│  apps/admin (Vite/React) │  HTTP  │   apps/api (Express)       │ Prisma │   MySQL       │
│  :5173                   │ ─────▶ │   :3000                    │ ─────▶ │ uni-nexus_db  │
│  (dev proxy /api → :3000)│  JSON  │   (adapter: @prisma/       │  SQL   │               │
└─────────────────────────┘        │    adapter-mariadb)         │        └──────────────┘
             ▲                     └───────────────────────────┘
             │            both import types + resource metadata from
             └────────────────  packages/shared  ─────────────────────
```

## Workspace layout

- **`apps/admin`** — the React/Vite single-page app. Entry point:
  [apps/admin/src/main.tsx](../apps/admin/src/main.tsx). It mounts the app into
  `index.html`'s `<div id="root">`, wraps everything in `QueryClientProvider` →
  `ToastProvider` → `BrowserRouter` → `AuthProvider`, and declares the route tree.
- **`apps/api`** — the Express API. Entry point:
  [apps/api/src/server.ts](../apps/api/src/server.ts), which starts the HTTP server built
  by [apps/api/src/app.ts](../apps/api/src/app.ts). All application routes are mounted
  under `/api/v1`.
- **`packages/shared`** — framework-free TypeScript: the `ResourceDefinition`/
  `FieldDefinition` types ([packages/shared/src/types.ts](../packages/shared/src/types.ts))
  and the generated `resources` array
  ([packages/shared/src/resources.ts](../packages/shared/src/resources.ts)) that both
  apps import as `@uni-nexus/shared`.

`npm run dev` at the root builds `@uni-nexus/shared` once, then runs its watcher plus the
API and admin dev servers concurrently, so edits to shared types/resources propagate to
both apps.

## React/Vite frontend

- **Routing** — `react-router-dom` v7. Public routes (`/login`, `/signup`,
  `/account-status`) sit outside the app shell; everything under `/app` renders inside
  [`Shell`](../apps/admin/src/components/shell.tsx), which owns the sidebar, topbar,
  workspace selector, and the auth/workspace gate (loading → error → signed-out →
  no-workspace → authenticated).
- **Data fetching** — TanStack Query for all server state (session, resource lists,
  record detail, dashboard, notifications). There is no separate client-side store;
  Query's cache is the state layer, invalidated after mutations.
- **Forms** — React Hook Form + a Zod resolver built per-resource from the field
  metadata (see [Resource engine](#resource-engine) below), in
  [resource-form.tsx](../apps/admin/src/components/resource-form.tsx).
- **Styling** — a single global stylesheet,
  [apps/admin/src/styles/global.css](../apps/admin/src/styles/global.css), imported once
  from `main.tsx`. It defines every semantic class the components use (`.sidebar`,
  `.panel`, `.button`, `.metric-card`, `.badge`, form and table styles, responsive rules,
  etc.) on top of Tailwind's reset (`@import 'tailwindcss'`, via the `@tailwindcss/vite`
  plugin declared in `vite.config.ts`). Components use these semantic classes directly;
  Tailwind utility classes are not used in JSX.
- **Auth context** — [lib/auth.tsx](../apps/admin/src/lib/auth.tsx) fetches `GET
  /auth/me` once via Query, exposes the current session, the list of workspaces the user
  belongs to, and the currently-selected workspace. The selected workspace prefers a
  `localStorage`-persisted explicit choice, then `users.default_workspace_id`, then the
  first active membership — never a workspace the user is no longer a member of. A
  `session-expired` window event (dispatched by the API client on a 401) clears the
  cached session so the UI re-prompts for sign-in.

## Node/Express backend

- **Middleware pipeline** (`app.ts`): `helmet` → CORS (explicit allow-list from
  `CORS_ORIGINS`) → `express.json` → `cookie-parser` → origin/CSRF check + input
  sanitization → the route tree → a 404 handler → a centralized error handler
  ([lib/errors.ts](../apps/api/src/lib/errors.ts)) that maps `AppError`, Zod errors, and
  known Prisma error codes to a consistent `{ error: { code, message } }` JSON shape.
- **Auth** — email/password with `bcrypt`, a JWT signed with `JWT_SECRET` and stored in
  an HttpOnly, `SameSite` cookie (`modules/auth/session.ts`). `requireAuth` verifies the
  cookie and re-checks the user is still `ACTIVE` on every request (a `PENDING`,
  `REJECTED`, or `SUSPENDED` account never gets a normal session — see
  [IDENTITY.md](IDENTITY.md)); `requireWorkspace` additionally resolves and authorizes
  workspace membership (from the URL param or the `X-Workspace-Id` header) and attaches
  `request.workspace = { id, role }`.
- **Authorization** — a small static role→permission table in
  [middleware/auth.ts](../apps/api/src/middleware/auth.ts). The official roles
  (`CEO`/`CTO` = all permissions; `COO`/`CVO` = `user_management`;
  `3D_DESIGNER`/`STAFF_OF_SPECIALTY`/`STAFF` scoped to specific domains) sit alongside
  legacy codes (`OWNER`/`ADMIN`/`MANAGER`/`DESIGNER`/`OPERATOR`) kept only as
  compatibility artifacts — see [IDENTITY.md](IDENTITY.md#rbac) for the full map. Every
  resource declares the single permission it requires; `authorize(permission)` checks it
  against the caller's role in the current workspace; `requireUserManagement` checks the
  `user_management` permission across *any* of the caller's workspace memberships,
  since account approval is a cross-workspace capability.
- **Modules** under `src/modules/`: `auth` (signup/login/logout/session/password, plus
  the one-time CTO bootstrap), `user-management` (account approval lifecycle),
  `team` (read-only internal directory), `profile` (self-service identity, presence,
  tags, pet, assets), `workspace` (workspace, members, roles), `resources` (the generic
  engine, below), `dashboard`, `costing`, `files` (private upload/download), and
  `workflows` (the cross-resource actions described in [MODULES.md](MODULES.md)). See
  [IDENTITY.md](IDENTITY.md) for the identity/RBAC subsystem in full.

## Resource engine

Most business modules (customers, products, orders, production, printers, materials,
quality control, and so on) are **not** hand-written CRUD endpoints. They are one
generic engine driven entirely by the metadata in `@uni-nexus/shared`'s `resources`
array:

- **Metadata** — each `ResourceDefinition` names a table, its fields (with type,
  required/nullable, relation target, select options, etc.), list columns, searchable
  fields, and the permission it requires. This metadata is generated by
  [scripts/generate-resources.mjs](../scripts/generate-resources.mjs) from a read-only
  export of the live MySQL schema (`docs/schema-columns.tsv` /
  `docs/schema-relations.tsv`) plus a small hand-maintained config (titles,
  descriptions, groupings, status enums). It is checked in, not regenerated on every
  build.
- **Backend** — [modules/resources/router.ts](../apps/api/src/modules/resources/router.ts)
  exposes `GET /meta` (the whole `resources` array) plus generic `GET/POST/PATCH` routes
  keyed by `:resource`. [repository.ts](../apps/api/src/modules/resources/repository.ts)
  is the single place that turns a resource key into a Prisma delegate — it only ever
  picks a model that exists in the reviewed `resources` registry, and derives the
  correct workspace/parent scope for every table automatically from the Prisma DMMF
  (so a request can never read or write outside its workspace).
  [validation.ts](../apps/api/src/modules/resources/validation.ts) builds a strict Zod
  schema per resource from its field metadata. [service.ts](../apps/api/src/modules/resources/service.ts)
  runs list/detail/save inside serializable transactions, with small
  domain-specific hooks in [services/domain.ts](../apps/api/src/services/domain.ts) for
  side effects a generic engine can't express (stock deduction, totals, state machines).
- **Frontend** — [pages/resources.tsx](../apps/admin/src/pages/resources.tsx) renders
  list/detail/new/edit for *any* resource key purely from its metadata, using
  [`ResourceTable`](../apps/admin/src/components/resource-table.tsx) and
  [`ResourceForm`](../apps/admin/src/components/resource-form.tsx). Route aliases
  (`apps/admin/src/lib/format.ts`) map a handful of resource keys to friendlier URL
  segments (e.g. `custom-requests` ↔ `/app/requests`).

A few pages are intentionally hand-written instead of generic: `Dashboard` (aggregated
metrics), `Notifications` (an inbox, not a table), and `Settings` (account/password,
workspace details, member and role management, and workspace preferences — backed by the
`workspace` module's endpoints, which don't fit the single-table resource model).

## File storage abstraction

[services/storage.ts](../apps/api/src/services/storage.ts) defines a small
`StorageService` interface (`save`/`absolutePath`/`remove`/`exists`) with one
implementation, `LocalStorageService`, writing under `apps/api/uploads/` (configurable
via `STORAGE_DRIVER`/`LOCAL_STORAGE_PATH`). Uploads are validated by extension,
declared MIME type, and file-signature (magic-byte) sniffing before being written, and
served back only through an authenticated, workspace-scoped download route — never as
static files.

## Future deployment

Today everything runs as local dev processes against Laragon/MySQL. The architecture
does not assume a specific host: the API is a stateless Express process behind
`DATABASE_URL`, ready to run behind any reverse proxy or process manager, and the admin
app builds to static files. Docker, Redis, a queue, GraphQL, or a hosted deployment
target are deliberately out of scope for this stage.
