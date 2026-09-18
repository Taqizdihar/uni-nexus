import {
  REVIEWER_ROLE_CODES,
  ROLE_CODES,
  type AllowedAccountActions,
  type RoleCode,
} from '@uni-nexus/shared';

export interface LifecycleContext {
  id: bigint;
  account_status: string;
  is_active: boolean;
  roles: readonly string[];
}
const has = (user: LifecycleContext, role: RoleCode) => user.roles.includes(role);
const active = (user: LifecycleContext) => user.is_active && user.account_status === 'ACTIVE';
export const isExecutive = (user: LifecycleContext) =>
  REVIEWER_ROLE_CODES.some((role) => has(user, role));

/** Resolve protection across every active official membership, independent of selected workspace. */
export function protectedRole(user: LifecycleContext): RoleCode | null {
  return (
    (['CTO', 'CEO', 'COO', 'CVO', '3D_DESIGNER', 'STAFF_OF_SPECIALTY', 'STAFF'] as const).find(
      (role) => has(user, role),
    ) ?? null
  );
}
const ordinary = (target: LifecycleContext) => !!protectedRole(target) && !isExecutive(target);
const senior = (actor: LifecycleContext) => has(actor, 'CEO') || has(actor, 'CTO');

export function canDirectDeactivate(actor: LifecycleContext, target: LifecycleContext): boolean {
  if (!active(actor) || !active(target) || actor.id === target.id || !isExecutive(actor))
    return false;
  if (has(target, 'CTO') || has(target, 'CEO')) return false;
  if (has(target, 'COO') || has(target, 'CVO')) return senior(actor);
  return ordinary(target);
}
export function canSubmitSelfDeactivationRequest(user: LifecycleContext): boolean {
  return active(user);
}
export function canApproveDeactivationRequest(
  actor: LifecycleContext,
  target: LifecycleContext,
): boolean {
  if (!active(actor) || !active(target) || !isExecutive(actor)) return false;
  if (has(target, 'CTO') || has(target, 'CEO')) return actor.id === target.id;
  if (has(target, 'COO') || has(target, 'CVO')) return actor.id === target.id || senior(actor);
  return ordinary(target);
}
export function canRejectDeactivationRequest(
  actor: LifecycleContext,
  target: LifecycleContext,
): boolean {
  // Protected CEO/CTO requests are confirmed by self or withdrawn from Profile.
  if (has(target, 'CTO') || has(target, 'CEO')) return false;
  return canApproveDeactivationRequest(actor, target);
}
export function canReactivate(actor: LifecycleContext, target: LifecycleContext): boolean {
  if (
    !active(actor) ||
    !target.is_active ||
    target.account_status !== 'SUSPENDED' ||
    !isExecutive(actor)
  )
    return false;
  if (has(target, 'CTO')) return has(actor, 'CEO') || has(actor, 'COO') || has(actor, 'CVO');
  if (has(target, 'CEO')) return has(actor, 'CTO');
  if (has(target, 'COO') || has(target, 'CVO')) return senior(actor);
  return ordinary(target);
}
export function getAllowedAccountActions(
  actor: LifecycleContext,
  target: LifecycleContext,
): AllowedAccountActions {
  const registration =
    active(actor) && isExecutive(actor) && target.is_active && target.account_status === 'PENDING';
  return {
    deactivate: canDirectDeactivate(actor, target),
    reactivate: canReactivate(actor, target),
    approve_registration: registration,
    reject_registration: registration,
    approve_deactivation_request: canApproveDeactivationRequest(actor, target),
    reject_deactivation_request: canRejectDeactivationRequest(actor, target),
  };
}
export function officialRoles(codes: readonly string[]): RoleCode[] {
  return ROLE_CODES.filter((role) => codes.includes(role));
}

export function canRecoverBootstrapCto(
  user: LifecycleContext & { email: string },
  loginEmail: string,
  bootstrap: { id: number; claimed_by_user_id: bigint | null; cto_email: string } | null,
): boolean {
  const normalize = (email: string) => email.trim().toLowerCase();
  return (
    !!bootstrap &&
    bootstrap.id === 1 &&
    bootstrap.claimed_by_user_id === user.id &&
    normalize(loginEmail) === normalize(bootstrap.cto_email) &&
    normalize(user.email) === normalize(bootstrap.cto_email) &&
    user.is_active &&
    user.account_status === 'SUSPENDED' &&
    has(user, 'CTO')
  );
}
