import { describe, expect, it } from 'vitest';
import { ROLE_CODES, REVIEWER_ROLE_CODES, type RoleCode } from '@uni-nexus/shared';
import {
  canApproveDeactivationRequest,
  canDirectDeactivate,
  canReactivate,
  canRecoverBootstrapCto,
  canRejectDeactivationRequest,
  canSubmitSelfDeactivationRequest,
  getAllowedAccountActions,
  protectedRole,
  type LifecycleContext,
} from './policy.js';
const user = (role: string, id = 1n, status = 'ACTIVE'): LifecycleContext => ({
  id,
  account_status: status,
  is_active: true,
  roles: [role],
});
const executives = [...REVIEWER_ROLE_CODES];
const ordinary: RoleCode[] = ['3D_DESIGNER', 'STAFF_OF_SPECIALTY', 'STAFF'];
const direct: Record<string, string[]> = {
  CTO: ['COO', 'CVO', ...ordinary],
  CEO: ['COO', 'CVO', ...ordinary],
  COO: ordinary,
  CVO: ordinary,
};
const approval: Record<string, string[]> = {
  CTO: [],
  CEO: [],
  COO: ['CEO', 'CTO'],
  CVO: ['CEO', 'CTO'],
  '3D_DESIGNER': executives,
  STAFF_OF_SPECIALTY: executives,
  STAFF: executives,
};
const reactivation: Record<string, string[]> = {
  CTO: ['CEO', 'COO', 'CVO'],
  CEO: ['CTO'],
  COO: ['CEO', 'CTO'],
  CVO: ['CEO', 'CTO'],
  '3D_DESIGNER': executives,
  STAFF_OF_SPECIALTY: executives,
  STAFF: executives,
};
describe('complete organizational authority matrices', () => {
  for (const actor of [...ROLE_CODES, 'OWNER', 'ADMIN', 'MANAGER', 'DESIGNER', 'OPERATOR']) {
    for (const target of ROLE_CODES) {
      it(`${actor} directly deactivating ${target}`, () => {
        expect(canDirectDeactivate(user(actor), user(target, 2n))).toBe(
          direct[actor]?.includes(target) ?? false,
        );
      });
      it(`${actor} reviewing ${target} request`, () => {
        const expected = approval[target]?.includes(actor) ?? false;
        expect(canApproveDeactivationRequest(user(actor), user(target, 2n))).toBe(expected);
        expect(canRejectDeactivationRequest(user(actor), user(target, 2n))).toBe(expected);
      });
      it(`${actor} reactivating ${target}`, () => {
        expect(canReactivate(user(actor), user(target, 2n, 'SUSPENDED'))).toBe(
          reactivation[target]?.includes(actor) ?? false,
        );
      });
    }
    it(`${actor} self actions`, () => {
      const self = user(actor);
      expect(canDirectDeactivate(self, self)).toBe(false);
      expect(canApproveDeactivationRequest(self, self)).toBe(
        executives.includes(actor as RoleCode),
      );
      expect(canRejectDeactivationRequest(self, self)).toBe(actor === 'COO' || actor === 'CVO');
      expect(canReactivate(self, { ...self, account_status: 'SUSPENDED' })).toBe(false);
    });
  }
});
describe('status and workspace protection', () => {
  it.each(['PENDING', 'REJECTED', 'SUSPENDED'])(
    'rejects self request and authority for %s accounts',
    (status) => {
      const actor = user('CTO', 1n, status);
      expect(canSubmitSelfDeactivationRequest(actor)).toBe(false);
      expect(canDirectDeactivate(actor, user('STAFF', 2n))).toBe(false);
      expect(canApproveDeactivationRequest(actor, user('STAFF', 2n))).toBe(false);
      expect(canReactivate(actor, user('STAFF', 2n, 'SUSPENDED'))).toBe(false);
    },
  );
  it('active accounts can request; unavailable records cannot', () => {
    expect(canSubmitSelfDeactivationRequest(user('STAFF'))).toBe(true);
    expect(canSubmitSelfDeactivationRequest({ ...user('CTO'), is_active: false })).toBe(false);
  });
  it('protects CTO even with Staff in another workspace', () => {
    const target = { ...user('STAFF', 2n), roles: ['STAFF', 'CTO', 'CEO'] };
    expect(protectedRole(target)).toBe('CTO');
    for (const role of executives) {
      expect(canDirectDeactivate(user(role), target)).toBe(false);
      expect(canApproveDeactivationRequest(user(role), target)).toBe(false);
    }
  });
  it('protects CEO across memberships and both COO/CVO peers together', () => {
    const ceo = { ...user('STAFF', 2n), roles: ['STAFF', 'CEO', 'COO'] };
    expect(canDirectDeactivate(user('CTO'), ceo)).toBe(false);
    const peer = { ...user('STAFF', 2n), roles: ['COO', 'CVO', 'STAFF'] };
    expect(canDirectDeactivate(user('CVO'), peer)).toBe(false);
    expect(canApproveDeactivationRequest(user('COO'), peer)).toBe(false);
    expect(canReactivate(user('COO'), { ...peer, account_status: 'SUSPENDED' })).toBe(false);
    expect(canDirectDeactivate(user('CEO'), peer)).toBe(true);
  });
  it('capabilities use the same policy and keep registration separate', () => {
    expect(getAllowedAccountActions(user('CEO'), user('CTO', 2n)).deactivate).toBe(false);
    expect(getAllowedAccountActions(user('CTO'), user('STAFF', 2n, 'PENDING'))).toMatchObject({
      approve_registration: true,
      deactivate: false,
      approve_deactivation_request: false,
    });
  });
  it('recovery is tied to claimed identity, normalized emails and active CTO membership', () => {
    const cto = { ...user('CTO', 42n, 'SUSPENDED'), email: 'cto@example.test' };
    const bootstrap = { id: 1, claimed_by_user_id: 42n, cto_email: 'CTO@example.test' };
    expect(canRecoverBootstrapCto(cto, ' CTO@example.test ', bootstrap)).toBe(true);
    expect(canRecoverBootstrapCto({ ...cto, id: 43n }, cto.email, bootstrap)).toBe(false);
    expect(canRecoverBootstrapCto(cto, 'other@example.test', bootstrap)).toBe(false);
    expect(canRecoverBootstrapCto({ ...cto, roles: ['CEO'] }, cto.email, bootstrap)).toBe(false);
    expect(canRecoverBootstrapCto({ ...cto, account_status: 'ACTIVE' }, cto.email, bootstrap)).toBe(
      false,
    );
  });
});
