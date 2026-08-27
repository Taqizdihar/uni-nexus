import type { StudioExternalRole } from '../../shared/party/studio-external-party.service';

export type ExternalRelationshipStatus = 'active' | 'role_inactive' | 'party_inactive';
export interface VendorListFilters { page?: number; limit?: number; search?: string; role?: StudioExternalRole; relationshipStatus?: ExternalRelationshipStatus; partyKind?: string; city?: string; hasActiveAssignment?: boolean; sortBy?: string; sortOrder?: 'asc' | 'desc'; }
