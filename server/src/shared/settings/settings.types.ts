import type { z } from 'zod';

export type SettingScope = 'organization' | 'craft' | 'studio';
export type SettingValue = boolean | number | string | null;
export type SettingGroup = 'general' | 'documents' | 'notifications' | 'studio';

export type SettingDefinition<T extends SettingValue = SettingValue> = {
  scope: SettingScope;
  group: SettingGroup;
  key: string;
  label: string;
  description: string;
  defaultValue: T;
  schema: z.ZodType<T>;
  isSecret: boolean;
  consumerNotes: string;
};

export type EffectiveSetting<T extends SettingValue = SettingValue> = {
  definition: SettingDefinition<T>;
  value: T;
  source: 'default' | 'override' | 'invalid_override';
  updatedAt: string | null;
  updatedBy: { id: number; fullName: string | null } | null;
};

export type SettingsSnapshot = {
  organizationId: number;
  businessUnits: Record<'CRAFT' | 'STUDIO' | 'SHARED', number>;
  settings: EffectiveSetting[];
};
