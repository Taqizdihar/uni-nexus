import { api } from '../../lib/api';

export type SettingScope = 'organization' | 'craft' | 'studio';
export type OrganizationSettings = { id: number; code: string; name: string; legal_name: string | null; email: string | null; phone: string | null; address: string | null; city: string | null; province: string | null; postal_code: string | null; country_code: string; currency_code: string; timezone: string; is_active: boolean; logo_configured: boolean; logo_url: string | null; };
export type SettingItem = { scope: SettingScope; group: string; key: string; label: string; description: string; default_value: string | number | boolean | null; value: string | number | boolean | null; source: 'default' | 'override' | 'invalid_override'; updated_at: string | null; updated_by: { id: number; fullName: string | null } | null; consumer_notes: string; };
export type SettingsSnapshot = { organization: OrganizationSettings; business_units: Record<'CRAFT' | 'STUDIO' | 'SHARED', number>; settings: SettingItem[]; };

export const settingsApi = {
  get: () => api.get<SettingsSnapshot>('/settings'),
  updateOrganization: (values: Partial<Omit<OrganizationSettings, 'id' | 'code' | 'is_active' | 'logo_configured' | 'logo_url'>>) => api.patch<OrganizationSettings>('/settings/organization', values),
  updateGroup: (scope: SettingScope, group: string, values: Record<string, unknown>) => api.patch<Omit<SettingsSnapshot, 'organization'>>(`/settings/groups/${scope}/${group}`, { values }),
  reset: (scope: SettingScope, group: string, key: string) => api.post<Omit<SettingsSnapshot, 'organization'>>(`/settings/groups/${scope}/${group}/${key}/reset`, {}),
  uploadLogo: (file: File) => { const form = new FormData(); form.append('logo', file); return api.post<OrganizationSettings>('/settings/organization/logo', form); },
  deleteLogo: () => api.delete<OrganizationSettings>('/settings/organization/logo'),
  logo: () => api.getBlob('/settings/organization/logo'),
};
