export interface ActiveUser {
  id: number;
  full_name: string;
  avatar_path: string | null;
  role: { code: string; name: string } | null;
  workspaces: Array<'craft' | 'studio'>;
  last_seen_at: string;
  is_self: boolean;
}

export interface PresenceSnapshot {
  active_users: ActiveUser[];
  active_count: number;
  ttl_seconds: number;
  generated_at: string;
}
