# Unified sales and production workflows

## Purpose

`/app/pesanan` and `/app/produksi` are operational workspaces over the existing
business records. They do not introduce a persisted workflow-stage column or replace
the established request, quotation, order, production, print, QC, packaging, cost, or
audit tables. A user can still open each legacy resource route when a full CRUD form is
needed.

The API derives the stage on every read in
[`stages.ts`](../apps/api/src/modules/workflows/stages.ts). This keeps dashboard cards,
tab counts, list filters, and detail pages consistent with the authoritative statuses.

## Sales workspace

Route: `/app/pesanan` (permission: `read`)

The tabs are `Semua`, `Permintaan Baru`, `Desain`, `Penawaran`, `Siap Produksi`,
`Produksi`, `Penyelesaian`, `Selesai`, and `Dibatalkan`. A row represents either:

- one `custom_requests` lifecycle, including all quotations and orders tied to it; or
- one direct `orders` record whose `custom_request_id` is `NULL`.

This prevents a request-to-order conversion from appearing twice while still retaining
direct/offline orders in the same sales queue. Filters include free-text search,
customer, status, target date/deadline, priority, assignee, payment status, source, and
sort direction. Pagination and counts are calculated from the same filtered, derived
rows.

### Stage precedence

The resolver intentionally evaluates the following rules in order:

1. A completed order is `COMPLETED` even if historic child records contain a failure.
2. A cancelled order, an infeasible/cancelled request without an active order, or a
   declined/expired quotation without an active order is `CANCELLED`.
3. A failed print or QC result `REPRINT` is `PRODUCTION`.
4. Successful prints, QC, or packaging work are `COMPLETION`.
5. Active order/production/print statuses are `PRODUCTION`.
6. An extant order without active production is `READY_FOR_PRODUCTION`.
7. A live quotation is `QUOTATION`; a design task is `DESIGN`; otherwise the request is
   `REQUEST`.

The detail page presents the request, design work, quotation revisions and pricing,
order/payment/shipping information, production/QC/packaging records, HPP, and relevant
audit trail together. Contextual actions link to the existing purpose-built forms, so
their authorization and validation rules remain the source of truth.

## Production workspace

Route: `/app/produksi` (permission: `read`)

Production jobs appear in a single operational queue with tabs for `Perlu Diproses`,
`Antrean Cetak`, `Sedang Dicetak`, `Perlu Perhatian`, `QC`, `Pengemasan`, and `Selesai`.
The resolver uses production-job, print-job, QC, packaging, and parent-order statuses;
failed prints and QC `FAIL`/`REWORK`/`REPRINT` take precedence as `Perlu Perhatian`.

## API surface

All endpoints are workspace-scoped and use the existing permission middleware:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/v1/workflows/orders` | Derived sales rows, counts, filters, sorting, pagination |
| `GET /api/v1/workflows/orders/:workflowKey` | Full request or direct-order workspace detail (`request:<id>` / `order:<id>`) |
| `GET /api/v1/workflows/production` | Derived production queue, counts, filters, pagination |
| `POST /api/v1/workflows/pricing/estimate` | Preview a rule-based quotation price without writing |
| `POST /api/v1/workflows/quotations/:id/items` | Add a priced item to a DRAFT quotation and refresh totals |
| `POST /api/v1/workflows/quotations/:id/revision` | Clone a quotation and its item snapshots as the next DRAFT revision |
| `POST /api/v1/quotations/:id/convert` | Idempotently convert an accepted quotation to an order |

Queue endpoints use compact relation graphs for the data required to resolve workflow
status. Detail-only records such as files, design assets, price breakdowns, slicing
history, and audit history are read only by the detail endpoint.

## Pricing, snapshots, and revisions

Pricing is calculated server-side by
[`pricing.ts`](../apps/api/src/modules/workflows/pricing.ts). `PER_GRAM` delegates to
the existing money rules, including the minimum price; `FIXED` uses a configured fixed
price; and `CUSTOM` requires an explicit manual unit price. A rule must be active,
within its effective dates, and belong to the current workspace. The material, product,
and variant are validated in that same workspace before an item is created.

When a rule-based item is written, the item stores the billable weight, pricing rule and
material IDs, rule name/type, rate/minimum/design/finishing values, calculation time,
and an auditable price breakdown JSON. These snapshots are immutable historical evidence:
editing a pricing rule later never changes a previously calculated quotation or order.

`POST /workflows/quotations/:id/revision` locks the source quotation, finds the next
revision number for that request, and clones all item and pricing snapshots into a new
`DRAFT` quotation. It writes an audit event. A database unique constraint on
`(custom_request_id, revision_no)` protects the revision sequence.

## Conversion and audit behavior

Converting an accepted quotation runs in one transaction, locks the quotation, returns
an earlier converted order if one exists, and otherwise creates the order with its
quotation/request references and product/variant item references. A normally `QUOTED`
request is advanced to `ACCEPTED` in that same transaction. It creates audit events and
an in-app notification. No production record is fabricated by conversion; production
planning remains an explicit operational action.

Existing generic resource APIs, status validation, stock/material deductions, legacy
links, and audit behavior remain in place. The workflow module only aggregates and
orchestrates them. Automatic scheduling, printer hardware control, and marketplace
delivery synchronization remain out of scope. The current `order_item -> production_job
-> print_job` model is also preserved; multi-order build-plate batching is a future
schema concern and is not introduced by this workflow consolidation.
