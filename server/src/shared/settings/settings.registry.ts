import { z } from 'zod';
import type { SettingDefinition, SettingScope, SettingValue } from './settings.types';

const integer = (minimum: number, maximum: number) => z.coerce.number().int().min(minimum).max(maximum);

export const settingsRegistry = [
  { scope: 'organization', group: 'general', key: 'week_start', label: 'Hari awal minggu', description: 'Menentukan batas periode minggu pada laporan dan ringkasan global.', defaultValue: 'monday', schema: z.enum(['monday', 'sunday']), isSecret: false, consumerNotes: 'Periode mingguan organisasi.' },
  { scope: 'organization', group: 'documents', key: 'pdf_footer_text', label: 'Footer PDF', description: 'Teks footer opsional pada PDF baru.', defaultValue: null, schema: z.string().trim().max(200).nullable(), isSecret: false, consumerNotes: 'PDF laporan dan dokumen komersial baru.' },
  { scope: 'organization', group: 'documents', key: 'show_organization_contact', label: 'Tampilkan kontak organisasi', description: 'Menampilkan email, telepon, dan alamat pada PDF baru.', defaultValue: true, schema: z.boolean(), isSecret: false, consumerNotes: 'PDF laporan dan dokumen komersial baru.' },
  { scope: 'organization', group: 'documents', key: 'show_organization_logo', label: 'Tampilkan logo organisasi', description: 'Menampilkan logo privat organisasi pada PDF baru jika tersedia.', defaultValue: true, schema: z.boolean(), isSecret: false, consumerNotes: 'PDF laporan dan dokumen komersial baru.' },
  { scope: 'craft', group: 'notifications', key: 'order_deadline_warning_hours', label: 'Peringatan deadline pesanan', description: 'Jam sebelum deadline pesanan Craft ketika sensor otomatis memberi peringatan.', defaultValue: 24, schema: integer(1, 168), isSecret: false, consumerNotes: 'Automation Sensor Craft.' },
  { scope: 'studio', group: 'studio', key: 'quotation_default_valid_days', label: 'Masa berlaku penawaran', description: 'Jumlah hari default untuk penawaran Studio baru.', defaultValue: 14, schema: integer(1, 365), isSecret: false, consumerNotes: 'Form penawaran Studio baru.' },
  { scope: 'studio', group: 'studio', key: 'invoice_default_due_days', label: 'Jatuh tempo invoice', description: 'Jumlah hari default untuk invoice Studio baru.', defaultValue: 14, schema: integer(1, 365), isSecret: false, consumerNotes: 'Form invoice Studio baru.' },
  { scope: 'studio', group: 'studio', key: 'payment_schedule_interval_days', label: 'Interval termin pembayaran', description: 'Interval hari default untuk preset jadwal pembayaran Studio baru.', defaultValue: 14, schema: integer(1, 365), isSecret: false, consumerNotes: 'Form invoice Studio baru.' },
  { scope: 'studio', group: 'studio', key: 'dashboard_due_soon_days', label: 'Jendela segera jatuh tempo', description: 'Hari ke depan untuk ringkasan dashboard Studio.', defaultValue: 7, schema: integer(1, 90), isSecret: false, consumerNotes: 'Dashboard Studio.' },
  { scope: 'studio', group: 'notifications', key: 'project_deadline_warning_hours', label: 'Peringatan deadline proyek', description: 'Jam sebelum deadline proyek Studio.', defaultValue: 24, schema: integer(1, 720), isSecret: false, consumerNotes: 'Automation Sensor Studio.' },
  { scope: 'studio', group: 'notifications', key: 'quotation_expiry_warning_days', label: 'Peringatan masa berlaku penawaran', description: 'Hari sebelum penawaran Studio berakhir.', defaultValue: 3, schema: integer(1, 90), isSecret: false, consumerNotes: 'Automation Sensor Studio.' },
  { scope: 'studio', group: 'notifications', key: 'invoice_due_soon_days', label: 'Peringatan invoice segera jatuh tempo', description: 'Hari sebelum invoice Studio jatuh tempo.', defaultValue: 3, schema: integer(1, 90), isSecret: false, consumerNotes: 'Automation Sensor Studio.' },
  { scope: 'studio', group: 'notifications', key: 'payment_schedule_due_days', label: 'Peringatan termin pembayaran', description: 'Hari sebelum termin pembayaran jatuh tempo.', defaultValue: 1, schema: integer(1, 30), isSecret: false, consumerNotes: 'Automation Sensor Studio.' },
  { scope: 'studio', group: 'notifications', key: 'asset_maintenance_warning_days', label: 'Peringatan perawatan aset', description: 'Hari sebelum jadwal perawatan aset Studio.', defaultValue: 7, schema: integer(1, 365), isSecret: false, consumerNotes: 'Automation Sensor Studio.' },
] as const satisfies readonly SettingDefinition[];

export const settingIdentity = (scope: SettingScope, group: string, key: string) => `${scope}:${group}:${key}`;

export const getSettingDefinition = (scope: SettingScope, group: string, key: string) =>
  settingsRegistry.find(item => item.scope === scope && item.group === group && item.key === key) as SettingDefinition | undefined;

export const settingsFor = (scope: SettingScope, group?: string) =>
  settingsRegistry.filter(item => item.scope === scope && (!group || item.group === group)) as SettingDefinition[];

export const settingValue = <T extends SettingValue>(definition: SettingDefinition<T>, value: unknown): T | null => {
  const parsed = definition.schema.safeParse(value);
  return parsed.success ? parsed.data : null;
};
