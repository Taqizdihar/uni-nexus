import { api } from '../../lib/api';
import type { PresenceSnapshot } from '../../types/presence';

export const presenceApi = {
  heartbeat: (session_key: string, workspace_code: 'craft' | 'studio') => api.post<PresenceSnapshot>('/presence/heartbeat', { session_key, workspace_code }),
  active: () => api.get<PresenceSnapshot>('/presence/active'),
  leave: (session_key: string) => api.post<PresenceSnapshot>('/presence/leave', { session_key }),
};
