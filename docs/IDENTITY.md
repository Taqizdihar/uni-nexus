# Identity, Accounts, RBAC, Team & Profile

UNI-NEXUS is an **internal** application for Uni-Inside staff only. Signing up does not
grant access — every account starts `PENDING` and must be reviewed by an authorized
executive before it can do anything. This document covers that lifecycle plus the
modules built around it: User Management, Team, and Profile.

## Account lifecycle

```text
Sign Up ──▶ PENDING ──▶ reviewed in User Management ──▶ APPROVE (role + workspace)
                                                    └──▶ REJECT (reason required)

ACTIVE account --> authorized deactivation --> SUSPENDED (Nonaktif) --> authorized reactivation --> ACTIVE
```

`users.account_status` is exactly one of `PENDING` / `ACTIVE` / `REJECTED` /
`SUSPENDED` (enforced by a MySQL check constraint, not just application code). Only
`ACTIVE` accounts get a normal session:

- `requireAuth` ([middleware/auth.ts](../apps/api/src/middleware/auth.ts)) re-checks
  `account_status === 'ACTIVE'` on **every** authenticated request — a session cookie
  issued while active does not survive the account being suspended.
- `login()` ([modules/auth/service.ts](../apps/api/src/modules/auth/service.ts)) checks
  password validity first (always, via a timing-safe dummy-hash comparison, so a
  nonexistent email takes the same time as a wrong password), then branches on account
  status *after* that check, returning `ACCOUNT_PENDING` / `ACCOUNT_REJECTED` (with the
  stored `rejection_reason`, if any) / `ACCOUNT_SUSPENDED` as a machine-readable
  `error.code` — never a generic "invalid credentials" once the password is confirmed
  correct. The admin app's `AuthPage` catches these codes and redirects to
  `/account-status` instead of entering the app shell.

The claimed bootstrap CTO can recover from `SUSPENDED` after a correct password,
matching claimed user ID and normalized bootstrap email, and an active CTO membership.
Recovery is transactional and does not change the bootstrap claim. Other suspended
accounts cannot recover by login. Lifecycle writes preserve `is_active`, roles and
memberships. See [Account Lifecycle](ACCOUNT-LIFECYCLE.md) for the exact hierarchy,
request workflow, continuity safeguards, API contracts, and verification report.

## Signup

`POST /api/v1/auth/signup` ([modules/auth/validation.ts](../apps/api/src/modules/auth/validation.ts))
takes `full_name`, `username` (3–30 chars, `[A-Za-z0-9._-]`, unique — matching the DB's
own `chk_users_username_format` check constraint), `email` (unique), `phone`, and
`password` (≥12 chars, ≤72 UTF-8 bytes for bcrypt). The client never sends `role`,
`account_status`, or a workspace — those are assigned later, only through User
Management. A normal signup creates a `PENDING` user with no workspace membership and
issues no session; the response is `{ status: 'PENDING', message }`, and the admin app
shows a dedicated pending-approval page rather than "log in now."

## The one-time CTO bootstrap

The `system_bootstrap` table is a **singleton row** (`id = 1`, enforced by
`chk_system_bootstrap_singleton`) holding `cto_email`, `default_workspace_id`,
`claimed_by_user_id`, and `claimed_at`. It is the *only* source of truth for the
one-time exception that turns the very first real signup into an active CTO instead of
a pending applicant — there is no `role=CTO` request parameter, and
`users.count() === 0` is never used for this (a pile of earlier `PENDING` signups must
not affect it).

`signup()`'s transaction:

1. `SELECT ... FROM system_bootstrap WHERE id = 1 FOR UPDATE` — this row lock
   serializes *every* signup (not just the bootstrap email's), which is what makes the
   claim race-free without a separate advisory lock.
2. Checks username/email uniqueness (post-lock, so a concurrent claim can't slip a
   duplicate email past this check).
3. If `claimed_at IS NULL` and the normalized (`trim().toLowerCase()`) request email
   matches `cto_email`: creates the workspace if `default_workspace_id` is still unset
   (named "3D Printing", matching the existing setup convention), creates the user as
   `ACTIVE` with `default_workspace_id` set, creates an `ACTIVE` `workspace_members` row
   with the `CTO` role, marks `system_bootstrap.claimed_at`/`claimed_by_user_id`, and
   issues a normal session — the person lands straight in the app.
4. Otherwise: the normal `PENDING` path (including a second attempt at the bootstrap
   email itself, once claimed — email uniqueness would reject it anyway).

The bootstrap email for this internal deployment is `m.taqizdihar@gmail.com`
(configured in the `system_bootstrap` row, not in application code or an env var). The
signup UI is the same form for everyone; there is no "register as CTO" affordance, and
the email is never revealed client-side.

The legacy `/setup` bootstrap (first-run `users.count() === 0` → create an `OWNER` +
first workspace) has been removed — there is already a workspace-creation path via the
CTO bootstrap above, and `/setup`'s old behavior of creating an `OWNER` would conflict
with the official role set.

## RBAC

Official role codes, seeded directly into `roles` (see the `roles` table — legacy codes
`OWNER`/`ADMIN`/`MANAGER`/`DESIGNER`/`OPERATOR` are not seeded rows, only compatibility
entries in the in-code permission map so old data/tests don't crash):

| Code                 | Display name                | Permissions (`rolePermissions` in `middleware/auth.ts`) |
| -------------------- | ---------------------------- | --------------------------------------------------------- |
| `CEO`                 | Chief Executive Officer      | `*` (everything)                                          |
| `CTO`                 | Chief Technology Officer      | `*` (everything) — primary system administrator          |
| `COO`                 | Chief Operating Officer       | `*` (general access; User Management actions remain policy-controlled) |
| `CVO`                 | Chief Verification Officer    | `*` (general access; User Management actions remain policy-controlled) |
| `3D_DESIGNER`         | 3D Designer                   | `read`, `design`                                          |
| `STAFF_OF_SPECIALTY`  | Staff of Specialty             | `read`, `production`                                      |
| `STAFF`               | Staff                          | `read`                                                    |

`user_management` gates User Management for exactly `CEO`, `COO`, `CTO`, and `CVO`;
legacy wildcard roles do not gain reviewer rights. It covers registration approval,
policy-controlled deactivation/request review/reactivation, and
assigning a role + workspace on approval. Team and Profile are **not** permission-gated
by role — every `ACTIVE` member of a workspace can read its Team directory and manage
their own Profile; only User Management is executive-only. Business permission
maps remain in `middleware/auth.ts`. Lifecycle hierarchy and protection are
centralized separately in `modules/account-lifecycle/policy.ts`. The
`STAFF`/`3D_DESIGNER`/`STAFF_OF_SPECIALTY` business-permission defaults are a starting
point and can be refined without changing lifecycle authority.

`requireUserManagement` is a fast-path check only (any active membership with a
official executive role, in *any* workspace — approval isn't scoped to one
workspace since a pending applicant doesn't have one yet). Every mutating
user-management action re-derives this authoritatively inside its own transaction (see
`assertReviewer` in
[modules/user-management/service.ts](../apps/api/src/modules/user-management/service.ts)),
the same defense-in-depth pattern `workspace/service.ts`'s `lockWorkspace` already used
for membership changes.

## User Management

**Route:** `/app/user-management` · **API:** `/api/v1/user-management/*` · permission:
`user_management`, checked cross-workspace.

Purpose-built endpoints — not generic CRUD over `users` (the [resources
engine](ARCHITECTURE.md#resource-engine) never exposes `users`, `roles`,
`workspace_members`, `system_bootstrap`, `account_deactivation_requests`,
`user_profile_assets`, or `user_tags`; its
`repository.ts` only ever picks a model present in the reviewed, hand-maintained
`resources` allow-list in `@uni-nexus/shared`, so introspecting new identity tables
could never accidentally expose them). `password_hash` is never selected by any identity
serializer, and the global `json replacer` ([lib/serialization.ts](../apps/api/src/lib/serialization.ts))
strips it a second time as a backstop.

- `GET /user-management/summary` — counts per `account_status`.
- `GET /user-management/reference` — the official roles + active workspaces, for the
  approval form.
- `GET /user-management` — filter by `status`, search name/username/email, paginated.
- `GET /user-management/:userId` — full detail (including `approved_by`/`rejected_by`).
- `POST /user-management/:userId/approve` — body `{ role_code, workspace_id }`.
  Transactionally: re-checks the reviewer, locks the target row (`SELECT ... FOR
  UPDATE`), requires `PENDING`, sets `account_status = ACTIVE` +
  `approved_by_user_id`/`approved_at` (clearing any prior rejection fields),
  upserts an `ACTIVE` `workspace_members` row with the chosen role, sets
  `default_workspace_id`, writes a `USER_APPROVED` audit entry, and sends the applicant
  an in-app `ACCOUNT_APPROVED` notification.
- `POST /user-management/:userId/reject` — body `{ reason }` (required). Sets
  `REJECTED` + `rejected_by_user_id`/`rejected_at`/`rejection_reason`.
- `POST /user-management/:userId/deactivate` - body `{ reason }` (at least 10
  trimmed characters). Uses the central lifecycle policy, sets `SUSPENDED`
  with `DIRECT_ADMIN` metadata, and preserves data and memberships. `/suspend` is a
  compatibility alias with the same validation and policy.
- `POST /user-management/:userId/reactivate` - body `{ note? }`. Uses the exact
  reactivation hierarchy and records the actor/time while preserving history.
- `GET /user-management/deactivation-requests` and `/:requestId` - safe request
  details, pending count and reviewer-specific capability flags.
- `POST /user-management/deactivation-requests/:requestId/approve` or `/reject` -
  conditional transactional resolution with the central review policy. Rejection
  requires a note; approval suspends the requester and ends a self-approver's session.

New `PENDING` signups trigger an in-app `ACCOUNT_APPROVAL_REQUESTED` notification to
every currently `ACTIVE` `CEO`/`COO`/`CTO`/`CVO` member, in each of their own
workspaces (`notifyReviewers` in `modules/user-management/service.ts`) — there is no
email/WhatsApp delivery for this.

## Team

**Route:** `/app/team`, `/app/team/:userId` · **API:** `/api/v1/team*` · requires an
active workspace membership, no extra permission.

A read-only internal directory scoped to the *current* workspace: only members with an
`ACTIVE` `workspace_members` row and an `ACTIVE` account are listed (never `PENDING`/
`REJECTED`/`SUSPENDED`, and never approval internals like `rejection_reason` or
`password_hash`). Search matches name/username/email. Clicking a member opens their
profile — full name, username, role (from the membership, not a free-text field),
presence status, bio, tags, and pet, using the same visual language as the personal
Profile page but with no editing affordances.

## Profile

**Route:** `/app/profile` (self only) · **API:** `/api/v1/profile*`.

Ownership rules the API enforces with strict Zod schemas (never a client-writable
`role_id`/`account_status`/approval field):

- **Role** is derived from `workspace_members → roles` for the user's default (or
  first active) workspace — never duplicated as text on `users`.
- **Account status** is read-only here; it only changes through User Management.
- **Presence status** (`DEFAULT`/`BUSY`/`SICK`/`LEAVE`) is a separate, user-editable
  field (`users.presence_status`, its own DB check constraint) — unrelated to account
  status. `POST /profile/presence` writes a `PRESENCE_CHANGED` audit entry.
- **Default workspace** must be one of the caller's own `ACTIVE` memberships
  (`POST /profile/default-workspace` re-verifies this server-side); the admin app falls
  back to the first active membership if it's ever unset or invalid.
- **Tags** (`user_tags`) — up to 5, unique text per user, contiguous `sort_order`
  1–5 enforced by a DB check constraint *and* the service layer. Reordering is
  implemented as delete-then-recreate inside one transaction (an arbitrary permutation
  can't be applied as sequential updates without transiently violating the unique
  constraint); adding/removing renumbers ascending in place instead, since that never
  collides.
- **Pet** (`pets` → `users.pet_id`) — nullable, must reference an `is_active` pet.
  `pets` is seeded separately; the app never fabricates one, and a genuinely empty
  `pets` table renders "No pets available yet" rather than erroring.
- **Photo / banner** (`user_profile_assets`, one row per `(user_id, asset_type)`) —
  uploaded via the existing [storage abstraction](ARCHITECTURE.md#file-storage-abstraction)
  (`LocalStorageService` today; swap-in-place for object storage later), validated by
  extension + declared MIME + magic-byte sniffing, image types only. Served back through
  `GET /profile/assets/:userId/:type`, not as a static file — the route allows viewing
  *any* `ACTIVE` user's asset (needed for Team) but only the owner may upload/replace
  their own.
- **Password** — reuses `POST /auth/password`; a successful change updates
  `password_changed_at` (shown on the Profile page as "last changed") and writes a
  `PASSWORD_CHANGED` audit entry.
- **Account deletion** - the existing red Penghapusan Akun card submits a
  reversible deactivation request through a custom modal. The account remains active
  while pending. The card shows the latest request status and timestamps and supports
  owner-only withdrawal through another confirmation modal. Profile endpoints:
  `GET/POST /profile/deactivation-request` and
  `POST /profile/deactivation-request/withdraw` with `{ request_id }`.

## Presence status design

Reference: a Discord-style colored calendar badge per status, matching
`PRESENCE_CONFIG` in
[components/presence-badge.tsx](../apps/admin/src/components/presence-badge.tsx):

| Status    | Color             | Icon                                                    |
| --------- | ----------------- | -------------------------------------------------------- |
| `DEFAULT` | bright green      | `CalendarCheck2` (lucide-react)                          |
| `BUSY`    | bright red        | `CalendarX2`                                             |
| `SICK`    | vivid purple      | `CalendarPlus2`                                          |
| `LEAVE`   | blue              | a small composed SVG (calendar + a rest/hammock arc) —   |
|           |                   | no lucide icon matched the reference closely enough      |

The badge always carries a text `aria-label`/`title` (e.g. "Presence status: Busy") so
color is never the only cue. It appears over the avatar on Profile/Team, and as a
`PresenceSelector` (labeled buttons, `role="radiogroup"`) in the profile edit flow.

## Audit events

Identity-related actions write audit entries inside the same
transaction as the change: `USER_REGISTERED`, `BOOTSTRAP_CTO_CLAIMED`,
`USER_APPROVED`, `USER_REJECTED`, `USER_DEACTIVATED`, `USER_REACTIVATED`,
`ACCOUNT_DEACTIVATION_REQUESTED`, `ACCOUNT_DEACTIVATION_WITHDRAWN`,
`ACCOUNT_DEACTIVATION_APPROVED`, `ACCOUNT_DEACTIVATION_REJECTED`,
`CTO_REACTIVATED_VIA_LOGIN`,
`PROFILE_UPDATED`, `PRESENCE_CHANGED`, `PASSWORD_CHANGED`. No password, hash, or secret
is ever written into `old_value_json`/`new_value_json`.
