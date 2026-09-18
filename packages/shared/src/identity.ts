export const ROLE_CODES = ['CEO', 'COO', 'CTO', 'CVO', '3D_DESIGNER', 'STAFF_OF_SPECIALTY', 'STAFF'] as const;
export type RoleCode = (typeof ROLE_CODES)[number];
export const ROLE_LABELS: Record<RoleCode, string> = {
  CEO: 'Chief Executive Officer',
  COO: 'Chief Operating Officer',
  CTO: 'Chief Technology Officer',
  CVO: 'Chief Verification Officer',
  '3D_DESIGNER': '3D Designer',
  STAFF_OF_SPECIALTY: 'Staff of Specialty',
  STAFF: 'Staff',
};
/** Roles with the account-management (User Management) permission; see rolePermissions in the API. */
export const REVIEWER_ROLE_CODES: readonly RoleCode[] = ['CEO', 'COO', 'CTO', 'CVO'];

/**
 * Organizational seats that only one person may hold at a time, globally, across every workspace.
 * Same 4 codes as REVIEWER_ROLE_CODES today, but a distinct concept — REVIEWER_ROLE_CODES governs who
 * can access User Management, this governs which roles are subject to singleton-occupancy enforcement.
 */
export const EXECUTIVE_SINGLETON_ROLE_CODES: readonly RoleCode[] = ['CEO', 'COO', 'CTO', 'CVO'];
export const isSingletonExecutiveRole = (code: string): code is RoleCode =>
  (EXECUTIVE_SINGLETON_ROLE_CODES as readonly string[]).includes(code);

export type ExecutiveSlotStatus = 'VACANT' | 'OCCUPIED';
export type ExecutiveSlot = { code: RoleCode; label: string; status: ExecutiveSlotStatus };

export const ACCOUNT_STATUSES = ['PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED'] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  PENDING: 'Menunggu', ACTIVE: 'Aktif', REJECTED: 'Ditolak', SUSPENDED: 'Nonaktif',
};
export const DEACTIVATION_REQUEST_STATUSES = ['PENDING', 'WITHDRAWN', 'APPROVED', 'REJECTED'] as const;
export type DeactivationRequestStatus = (typeof DEACTIVATION_REQUEST_STATUSES)[number];
export const DEACTIVATION_REQUEST_LABELS: Record<DeactivationRequestStatus, string> = {
  PENDING: 'Menunggu Peninjauan', WITHDRAWN: 'Ditarik Kembali', APPROVED: 'Disetujui', REJECTED: 'Ditolak',
};
export type AllowedAccountActions = {
  deactivate: boolean;
  reactivate: boolean;
  approve_registration: boolean;
  reject_registration: boolean;
  approve_deactivation_request: boolean;
  reject_deactivation_request: boolean;
};
export type DeactivationRequestSummary = {
  id: string;
  user_id: string;
  request_status: DeactivationRequestStatus;
  request_reason: string | null;
  requested_at: string;
  withdrawn_at: string | null;
  reviewed_at: string | null;
  review_note: string | null;
};

export const PRESENCE_STATUSES = ['DEFAULT', 'BUSY', 'SICK', 'LEAVE'] as const;
export type PresenceStatus = (typeof PRESENCE_STATUSES)[number];
export const PRESENCE_LABELS: Record<PresenceStatus, string> = {
  DEFAULT: 'Default',
  BUSY: 'Sibuk',
  SICK: 'Sakit',
  LEAVE: 'Cuti',
};

export const PROFILE_ASSET_TYPES = ['PROFILE_PHOTO', 'PROFILE_BANNER'] as const;
export type ProfileAssetType = (typeof PROFILE_ASSET_TYPES)[number];

export const MAX_USER_TAGS = 5;
export const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,30}$/;
