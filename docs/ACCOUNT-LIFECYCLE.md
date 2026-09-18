# Account lifecycle implementation and handoff

Implemented in the existing UNI-NEXUS application on 18 September 2026. “Penghapusan
Akun” is reversible account deactivation: `ACTIVE → SUSPENDED`, displayed as
**Nonaktif**. No account deletion, new account status, SQL migration, schema push,
reset, bootstrap claim, reseed, or membership removal was performed.

## Files changed for this task

- Shared contracts: `packages/shared/src/identity.ts`.
- Prisma introspection: `apps/api/prisma/schema.prisma`.
- Central backend policy, role resolution, validation, transactions and tests:
  `apps/api/src/modules/account-lifecycle/{policy,context,validation,service}.ts`,
  `policy.test.ts`, and `service.test.ts`.
- Reviewer gates: `apps/api/src/middleware/auth.ts`.
- Login recovery and regression tests:
  `apps/api/src/modules/auth/service.ts` and `auth.test.ts`.
- User Management integration:
  `apps/api/src/modules/user-management/{service,router}.ts` and
  `user-management.test.ts`.
- Profile endpoints: `apps/api/src/modules/profile/router.ts`.
- Generic resource protection: `apps/api/src/modules/resources/repository.ts`.
- Frontend modal and date/error helpers:
  `apps/admin/src/components/account-action-modal.tsx` and
  `apps/admin/src/lib/account-lifecycle.ts`.
- Frontend workflows:
  `apps/admin/src/pages/{profile,user-management,deactivation-requests,account-status}.tsx`.
- Cross-workspace navigation and modal styling:
  `apps/admin/src/components/shell.tsx` and `apps/admin/src/styles/global.css`.
- Documentation: this report and `docs/IDENTITY.md`.

Existing unrelated edits were preserved, including the prior Profile refinement,
presence changes, profile asset URL work, session photo support, and branding asset.

## Prisma and database inspection

`SHOW CREATE TABLE` inspected `users`, `account_deactivation_requests`, and
`system_bootstrap` before implementation. The request table uses an existing stored
generated `pending_user_id` with unique index `uq_adr_one_pending`. MySQL generates
that field; application writes omit it.

`npm run db:pull` succeeded and introspected **51 models**. `npm run db:generate`
succeeded with Prisma Client **7.10.0** after introspection. All six lifecycle metadata
columns and the request table/status enum are recognized. Prisma reported its
existing limitation representing MySQL check constraints; the live constraints
remain enforced by MySQL. No migration or database schema write was made.

## Policy architecture and exact authority

`account-lifecycle/policy.ts` exposes pure functions for direct deactivation,
self-request submission, approval, rejection, reactivation, capability calculation,
role protection, and bootstrap recovery eligibility. The backend remains authoritative.

`context.ts` resolves active official roles across all active memberships in active
workspaces, with active role records. Protection priority is CTO, CEO, COO/CVO, then
non-executives. A Staff role in a selected workspace cannot downgrade a CTO or CEO
membership elsewhere. Combined COO/CVO memberships retain both peer restrictions.

User Management reviewers are exactly `CEO`, `COO`, `CTO`, and `CVO`, from the shared
`REVIEWER_ROLE_CODES`. Legacy OWNER/ADMIN wildcards do not grant this authority.

### Direct deactivation

| Actor | Permitted targets |
| --- | --- |
| CEO | COO, CVO, 3D_DESIGNER, STAFF_OF_SPECIALTY, STAFF |
| CTO | COO, CVO, 3D_DESIGNER, STAFF_OF_SPECIALTY, STAFF |
| COO | 3D_DESIGNER, STAFF_OF_SPECIALTY, STAFF |
| CVO | 3D_DESIGNER, STAFF_OF_SPECIALTY, STAFF |
| Non-executives and legacy roles | None |

All direct self-actions are forbidden. No account can directly deactivate CTO or CEO.
Both actor and target must be available and ACTIVE.

### Request approval and rejection

| Requester role | Permitted approvers | Permitted rejectors |
| --- | --- | --- |
| CTO | Same requester only | None; requester may withdraw |
| CEO | Same requester only | None; requester may withdraw |
| COO | Same requester, CEO, CTO | Same requester, CEO, CTO |
| CVO | Same requester, CEO, CTO | Same requester, CEO, CTO |
| 3D_DESIGNER | CEO, COO, CTO, CVO | CEO, COO, CTO, CVO |
| STAFF_OF_SPECIALTY | CEO, COO, CTO, CVO | CEO, COO, CTO, CVO |
| STAFF | CEO, COO, CTO, CVO | CEO, COO, CTO, CVO |

Another CTO cannot review a protected CTO request. Non-executives cannot approve
their own requests, but may withdraw while pending. CEO/CTO self-requests use
self-confirmation or withdrawal, as required by the protected-request exception.

### Reactivation

| Target | Permitted actors |
| --- | --- |
| CTO | CEO, COO, CVO; claimed bootstrap CTO also has recovery login |
| CEO | CTO only |
| COO | CEO, CTO |
| CVO | CEO, CTO |
| 3D_DESIGNER | CEO, COO, CTO, CVO |
| STAFF_OF_SPECIALTY | CEO, COO, CTO, CVO |
| STAFF | CEO, COO, CTO, CVO |

Actor must be available and ACTIVE; target must be available and SUSPENDED. Normal
UI sessions do not provide CTO self-reactivation. CEO login never auto-reactivates.

## Transaction, withdrawal and continuity behavior

Lifecycle writes lock actor/target accounts in ID order and lock membership/role/
workspace rows before re-reading policy contexts. Transactions use READ COMMITTED.
Request resolution conditionally updates only `request_status = PENDING`; a lost
race returns `DEACTIVATION_REQUEST_ALREADY_RESOLVED` and rolls back related writes.

Submission requires an ACTIVE available account and uses both an explicit pending
check and the database unique index. Duplicate errors become
`DEACTIVATION_REQUEST_ALREADY_PENDING`. Withdrawal requires the request owner and
the exact request ID, records WITHDRAWN/time, and leaves account status unchanged.
Resolved requests remain in history.

Direct deactivation requires a trimmed reason of at least ten characters, writes
DIRECT_ADMIN metadata, and creates no request row. Approval writes review metadata
and SELF_REQUEST deactivation metadata. Both suspend the account and clear current
reactivation metadata. Neither changes `is_active`, passwords, profiles, roles or
workspace memberships. Rejection requires a note and leaves the account ACTIVE.

Reactivation records the actor/time and retains latest deactivation metadata and
request history. Memberships need no recreation.

Self-deactivation of the last executive reviewer requires either another active
executive or the verified claimed bootstrap CTO recovery path. Checks serialize
using a read-only lock on the bootstrap singleton. This safeguard never grants
authority forbidden by the hierarchy and permits the sole claimed CTO to self-deactivate
and recover later.

## CTO recovery and session termination

Login validates the password before considering recovery. A suspended account may
recover only when bootstrap ID is 1, claimed user ID matches the account, normalized
login/account/bootstrap emails match, and the account has an active CTO membership
in an active workspace with an active role. Transactional re-reading also rejects a
password changed during recovery. Concurrent already-completed recovery proceeds
without a duplicate reactivation event.

Recovery sets ACTIVE, self as reactivation actor, and the timestamp, writes
CTO_REACTIVATED_VIA_LOGIN, then follows normal login/session issuance. It never
changes bootstrap claim fields. Every other suspended account receives ACCOUNT_SUSPENDED.

Successful self-approval returns `session_ended`, clears the session cookie, clears
frontend authenticated/cache state, and navigates to the Akun Nonaktif page.
`requireAuth` checks ACTIVE on every request, including requests using an older cookie.

## Profile and User Management UI

The existing Profile layout remains intact. Its Penghapusan Akun card now loads the
latest own request, opens a custom submission modal, explains preserved data and
continued access while pending, and accepts an optional reason. Pending state shows
Menunggu Peninjauan and Indonesian date/time, replaces submission with withdrawal,
and prevents duplicate submission. Withdrawal has a separate custom modal.

User Management retains Menunggu/Aktif/Ditolak/Nonaktif/Semua account tabs and adds
Permintaan Penghapusan with a pending badge. The request area has status filters,
pagination, avatar/initials, identity, full role title, request time/reason, current
account status, request status, and review time/note. Protected or resolved requests
show no unauthorized review buttons.

Account rows render backend `allowed_actions` for deactivation, reactivation and
registration approval/rejection. Request responses provide reviewer-specific
`allowed_actions.approve/reject`. Custom modals confirm direct deactivation,
reactivation and request review. Direct deactivation requires a reason; rejection
requires a review note; reactivation and approval accept optional notes. Registration
rejection also uses the custom modal. These workflows use no `window.confirm()`.

Modals retain Uni-Inside colors, support Escape, focus trapping/restoration,
background scroll locking, pending-state controls, and scrolling on short screens.
SUSPENDED is presented as Nonaktif without changing stored status values.

## Dedicated APIs and resource security

- `GET/POST /api/v1/profile/deactivation-request`
- `POST /api/v1/profile/deactivation-request/withdraw` with `{ request_id }`
- `POST /api/v1/user-management/:userId/deactivate` with `{ reason }`
- `POST /api/v1/user-management/:userId/reactivate` with `{ note? }`
- `GET /api/v1/user-management/deactivation-requests` with status/page/pageSize
- `GET /api/v1/user-management/deactivation-requests/:requestId`
- `POST /api/v1/user-management/deactivation-requests/:requestId/approve` with `{ note? }`
- `POST /api/v1/user-management/deactivation-requests/:requestId/reject` with `{ note }`

The existing `/suspend` endpoint is a compatibility alias with the same hierarchy
and mandatory reason, so old callers cannot bypass policy.

Generic resource definitions/repositories explicitly reject users, workspace_members,
roles, system_bootstrap, and account_deactivation_requests. The registry remains an
allow-list. Request serializers omit security/storage details and the generated
uniqueness field. Historical suspended users use avatar initials instead of linking
to profile assets restricted to ACTIVE users.

Registration signup/PENDING approval, role/workspace assignment, rejection,
USER_APPROVED/USER_REJECTED auditing and approval notifications remain separate.

## Audit and notifications

Events: ACCOUNT_DEACTIVATION_REQUESTED, ACCOUNT_DEACTIVATION_WITHDRAWN,
ACCOUNT_DEACTIVATION_APPROVED, ACCOUNT_DEACTIVATION_REJECTED, USER_DEACTIVATED,
USER_REACTIVATED, and CTO_REACTIVATED_VIA_LOGIN. Lifecycle audit metadata identifies
actor, target, source and relevant request/role/time. No passwords or secrets are logged.

Submission notifications go only to active accounts permitted by the same approval
policy, once per account in an active workspace. CEO/CTO requests notify only the
requester; COO/CVO requests notify CEO/CTO and the eligible requester; non-executive
requests notify executives. Deactivation, review outcomes and reactivation notify
the target through the existing in-app provider, respecting notification preferences.

## Executed verification

- Prisma pull and client generation: passed.
- `npm run test`: **390 tests passed across 14 files**. Coverage includes the full
  official/legacy policy matrices, status checks, multi-workspace protection,
  request/withdraw/review conflicts, preservation invariants, notification recipients,
  generic resource protection, last-reviewer recovery exception, correct/wrong CTO
  password recovery, claimed identity/email/role mismatches, active-login behavior,
  concurrent recovery, password changes, cookie clearing and old-session rejection.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed. Vite reported a non-blocking bundle-size warning.
- `npm run dev`: executed after restarting the existing verified repository dev
  process tree. Vite, Express, and the shared TypeScript watcher started successfully.
- Live database readiness and authenticated GETs for auth/me, Profile, own request,
  User Management summary/reference, registration queue and request queue returned 200.
- Read-only browser smoke: Profile and request area loaded; request modal opened and
  cancelled; current CTO was ACTIVE with no own request. Mobile modal fit a 390×844
  viewport with accessible confirmation controls.
- Browser fixture smoke intercepted every API request. Submission, pending state,
  duplicate-submit hiding, withdrawal, direct reason validation, reactivation,
  CTO/CEO protection, COO/CVO peer hiding, pending badge, and self-approval navigation
  all passed with no page errors. No fixture browser mutation reached the live API.
- A disposable Prisma transaction checked real generated-column behavior, duplicate
  pending uniqueness, generated-column clearing, resubmission, conditional resolution,
  actual row-lock SQL and membership preservation. Every fixture record was rolled back.

Live password entry for the real CTO was not executed: its password was not provided,
and its login timestamp was preserved. A locally signed read-only smoke session
verified its authenticated access; password/session/recovery behavior was exercised
with isolated fixtures. This is the remaining manual credential check.

## Final verification and protected account evidence

The final lint, typecheck, 390-test run, production build, and `git diff --check`
all passed. The development servers remain running at `http://127.0.0.1:5173`
(frontend) and `http://localhost:3000` (backend). Final readiness/authenticated GET
checks returned 200, Profile and User Management loaded again, and the real CTO's
direct-deactivation capability was false.

A SHA-256 comparison over the full CTO row, its memberships, bootstrap singleton
and request history matched the pre-runtime baseline. The real account
`m.taqizdihar@gmail.com` remains ACTIVE, `is_active = true`, with zero pending
deactivation requests. Password/profile/lifecycle/registration/login fields,
membership rows and bootstrap claim fields were unchanged. The baseline contained
only a digest; it was removed with temporary session files. Browser smoke cookies
were also cleared. No implemented lifecycle feature is left unfinished. The manual
real-password login check and the existing bundle-size warning remain as the stated
verification limitation and non-blocking item.
