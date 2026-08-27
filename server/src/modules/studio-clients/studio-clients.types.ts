/**
 * Effective Studio Client relationship state, derived — never stored:
 * - active: Party is globally active AND the studio_client role is active and within its date window.
 * - role_inactive: Party is globally active but the studio_client role is off or outside its window.
 * - party_inactive: the Party itself is globally inactive/deleted, overriding the role state.
 */
export type ClientRelationshipStatus = 'active' | 'role_inactive' | 'party_inactive';

export interface ClientListFilters {
  page?: number;
  limit?: number;
  search?: string;
  relationshipStatus?: ClientRelationshipStatus;
  partyKind?: string;
  city?: string;
  hasActiveProject?: boolean;
  repeatClient?: boolean;
  hasOutstanding?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ClientProjectFilters {
  status?: 'all' | 'active' | 'completed' | 'cancelled';
  page?: number;
  limit?: number;
}
