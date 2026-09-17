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

export const ACCOUNT_STATUSES = ['PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED'] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const PRESENCE_STATUSES = ['DEFAULT', 'BUSY', 'SICK', 'LEAVE'] as const;
export type PresenceStatus = (typeof PRESENCE_STATUSES)[number];
export const PRESENCE_LABELS: Record<PresenceStatus, string> = {
  DEFAULT: 'Default',
  BUSY: 'Busy',
  SICK: 'Sick',
  LEAVE: 'Leave',
};

export const PROFILE_ASSET_TYPES = ['PROFILE_PHOTO', 'PROFILE_BANNER'] as const;
export type ProfileAssetType = (typeof PROFILE_ASSET_TYPES)[number];

export const MAX_USER_TAGS = 5;
export const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,30}$/;
