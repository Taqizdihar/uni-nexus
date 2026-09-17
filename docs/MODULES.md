# Modules

Every module below is rendered by the generic [resource engine](ARCHITECTURE.md#resource-engine)
unless noted otherwise. "Route" is the admin app path under `/app/`; "permission" is the
role permission required to use it (see [middleware/auth.ts](../apps/api/src/middleware/auth.ts)
— `CEO`/`CTO` hold every permission). The identity-specific modules — **User
Management**, **Team**, and **Profile** — are documented separately in
[IDENTITY.md](IDENTITY.md), since they're built on purpose-written APIs rather than the
generic resource engine and involve an account-approval lifecycle the table below
doesn't cover.

## Dashboard

**Route:** `/app/dashboard` · custom page (not a resource)

Workspace-wide metrics: open requests, pending quotations, active orders, queued
production, active print jobs, printer status breakdown, total material used, recent
audit activity, and recent print failures. Estimated/actual HPP totals are only included
for callers with the `finance` permission. Backed by
[modules/dashboard/router.ts](../apps/api/src/modules/dashboard/router.ts) (`GET
/dashboard`), which runs the metric queries in parallel against `workspace_id`-scoped
tables. Renders correctly with all-zero metrics and empty lists when the workspace is new.

## Customers

**Route:** `/app/customers` · permission: `sales`

A shared, company-wide directory (not scoped per workspace — see
[DATABASE.md](DATABASE.md#workspace-scoping)) of customer contacts and notes.

## Products

**Route:** `/app/products` · permission: `sales`, design assets: `design`

The product catalog, plus its child modules on the same tabbed navigation: categories,
variants, images, private design/model assets, and sales-channel listing links (link
storage only — no marketplace sync). Products can be archived/activated from the detail
view. A draft product can also be created directly **from a design asset** (see
[Design](#design) below).

## Custom requests

**Route:** `/app/requests` (resource key `custom-requests`) · permission: `sales`

Intake for custom job requests, moving through
`NEW → UNDER_REVIEW → NEED_INFORMATION → FEASIBLE/NOT_FEASIBLE → ESTIMATING → QUOTED →
ACCEPTED/DECLINED/CANCELLED`. Includes reference files and internal/customer-facing
notes as related tabs.

## Design

**Route:** `/app/design-tasks` · permission: `design`

Design task assignment and review (`PENDING → IN_PROGRESS → REVIEW → COMPLETED`/
`CANCELLED`), with versioned design assets attached to each task. A design asset can be
promoted into a private draft product via `POST
/design-assets/:id/create-product` (button on the asset's detail page) — this is a
one-way workflow action, not a generic field edit, implemented in
[modules/workflows/router.ts](../apps/api/src/modules/workflows/router.ts).

## Pricing

**Route:** `/app/pricing-rules` · permission: `finance`

Weight-based (`PER_GRAM`) or flat pricing rules, with an optional effective date range.
`POST /costs/estimate` (used by quoting) computes a price for a given rule and billable
gram weight.

## Quotations

**Route:** `/app/quotations` · permission: `sales`

Itemized quotations with server-calculated line amounts and totals
(`DRAFT → APPROVED → SENT → ACCEPTED/DECLINED/EXPIRED`). An **accepted** quotation can be
**converted to an order** (button on its detail page → `POST
/quotations/:id/convert`), which snapshots its items into a new order inside one
transaction and is idempotent (converting twice returns the existing order).

## Orders

**Route:** `/app/orders` · permission: `sales`

Confirmed customer orders and their line items
(`CONFIRMED → IN_PRODUCTION → ON_HOLD → QC → PACKAGING → READY → COMPLETED`/
`CANCELLED`), with a separate payment-status field. Orders created through quotation
conversion carry a reference back to their originating quotation and custom request.

## Production

**Route:** `/app/production` (resource key `production-jobs`) · permission: `production`

Plans the work for each order item and assigns an operator
(`WAITING → QUEUED → IN_PROGRESS → PRINTING → QC → PACKAGING → COMPLETED`, or
`ON_HOLD`/`CANCELLED`). This is the hub that print jobs, QC inspections, and packaging
all reference.

## Printers

**Route:** `/app/printers` · permission: `production`

The printer fleet roster (brand, model, location). Status
(`IDLE`/`QUEUED`/`PRINTING`/`MAINTENANCE`/`OFFLINE`/`ERROR`) is managed manually, not
polled from hardware — no printer/hardware integration is wired up in this stage.

## Print profiles

**Route:** `/app/print-profiles` · permission: `production`

Reusable slicer settings (layer height, etc.) tied to a printer and material, used when
queuing print jobs and recording slicing results.

## Materials

**Route:** `/app/materials` · permission: `production`

Material specifications and manufacturers referenced by print profiles, filament stock,
and cost components.

## Filament

**Route:** `/app/filament` (resource key `filament-spools`) · permission: `production`

Per-spool inventory (`AVAILABLE`/`IN_USE`/`LOW`/`EMPTY`/`ARCHIVED`) tracked in grams and
purchase cost. Recording a material usage against a print job deducts spool weight
atomically inside the same transaction (see `services/domain.ts`) — stock is never
adjusted by a separate, un-audited step.

## Print jobs (Print queue)

**Route:** `/app/print-queue` (resource key `print-jobs`) · permission: `production`

Individual print attempts against a production job and printer
(`QUEUED → PRINTING → PAUSED → SUCCESS/FAILED/CANCELLED`), including retries. Slicing
results (estimated weight, time, support usage) are attached per attempt.

## Failures

**Route:** `/app/failures` (resource key `print-failures`) · permission: `production`

Failed-print records: failure type, wasted filament weight, and root cause — the
workspace's shared record of what went wrong and why, surfaced on the dashboard.

## Experiments

**Route:** `/app/experiments` · permission: `production`

Material/print-setting experiments and their measurements, so a successful test
configuration can be looked up later instead of re-discovered.

## Costing & HPP

**Route:** `/app/costing` (resource key `production-costs`) · permission: `finance`

Itemized estimated vs. actual cost records (material, machine time, electricity, design,
waste, packaging), backed by reusable cost components. `GET /costs/summary` (used by this
page's cost overview panel) rolls these up into estimated HPP, actual HPP, selling price,
margin, and a material/waste/packaging cost breakdown — see
[services/costing.ts](../apps/api/src/services/costing.ts).

## Quality control (QC)

**Route:** `/app/qc` (resource key `qc-inspections`) · permission: `production`

Inspections against a production job and print job, each with checklist items
(dimensions, surface quality, color, assembly, completeness) and a pass/rework/reprint
result.

## Packaging

**Route:** `/app/packaging` (resource key `order-packaging`) · permission: `production`

Packing work and actual packaging cost per order, drawing from a shared list of
packaging types and their standard costs.

## IP & licensing (IP review)

**Route:** `/app/ip-reviews` · permission: `design`

Human review of design ownership / commercial-use concerns for a custom request or
order, with a supporting checklist. This is a manual review record, not an automated IP
scan.

## Notifications

**Route:** `/app/notifications` · custom page (inbox), settings at `/app/notification-settings`
(generic resource) · permission: `read`

In-app notifications only in this stage — email and WhatsApp delivery channels are
reserved in the `notification_settings` schema but not implemented. The notifications
page is hand-written (mark-as-read, unread filter, pagination) rather than a generic
table, because an inbox isn't a plain CRUD list.

## Audit

**Route:** `/app/audit` (resource key `audit-logs`) · permission: `audit` · read-only

Every create/update/status-change across every module writes an audit log entry (old
value, new value, actor, timestamp) inside the same transaction as the change — see
[services/audit.ts](../apps/api/src/services/audit.ts). This resource is read-only in
the UI; there is no manual create/edit route for it.

## Settings

**Route:** `/app/settings` · custom page, tabs gated by the `settings` permission
(`OWNER`/`CEO`/`ADMIN`/`CTO`)

Not a single resource — it composes several already-built API surfaces that don't fit
the single-table resource model. This is workspace *administration* (adding an
already-approved user to an additional workspace, editing workspace details); initial
account approval is a separate, executive-only flow — see [User
Management](IDENTITY.md#user-management).

- **Account** (everyone) — view your name/email, change your password. The fuller
  personal-identity experience (bio, presence, tags, pet, photo/banner, default
  workspace) lives on the [Profile page](IDENTITY.md#profile) instead.
- **Workspace** — edit the workspace name/description (`PATCH /workspaces/:id`).
- **Members** — add an *already-approved, active* user by email to this workspace, or
  change a member's role/active status (`GET/POST/PATCH /workspaces/:id/members`). This
  no longer activates a `PENDING` account as a side effect — only User Management does
  that.
- **Roles** — enable one of the official role codes (or a legacy one, kept only as a
  compatibility artifact) for this workspace with a display name/description
  (`GET/POST /workspaces/:id/roles`). See [IDENTITY.md](IDENTITY.md#rbac) for the
  official set and what each one can do. Owner/CEO access can only be granted by an
  existing owner or CEO.
- **Preferences** — the generic `workspace-settings` resource (free-form key/value
  workspace preferences), rendered with the same `ResourceTable` every other module uses.
