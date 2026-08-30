export interface UserResponse {
  id: number;
  organization_id: number;
  full_name: string;
  username: string;
  email: string;
  phone: string | null;
  avatar_path: string | null;
  profile_banner_path: string | null;
  profile_status_code: 'default' | 'busy' | 'sick' | 'leave';
  default_workspace_code: 'craft' | 'studio';
  status_code: string;
  approval_status_code: string;
  registration_source: string;
  approval_requested_at: Date;
  approved_at: Date | null;
  created_at: Date;
  last_login_at: Date | null;
  password_changed_at?: Date | null;
  role?: {
    code: string;
    name: string;
  };
}
