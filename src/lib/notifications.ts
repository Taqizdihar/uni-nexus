import type { LucideIcon } from 'lucide-react';
import { Bell, Box, CircleDollarSign, FileText, FolderKanban, Layers, Package, Printer, ShoppingCart, Users, Zap } from 'lucide-react';

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error' | 'critical';
export type AppNotification = {
  id: number;
  notification_type: string;
  module_code: string | null;
  severity_code: NotificationSeverity;
  title: string;
  message: string;
  action_url: string | null;
  entity_type: string | null;
  entity_id: number | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  workspace: { id: number; code: string; name: string } | null;
};

export type NotificationSummary = { unread_count: number; critical_unread_count: number; today_count: number };
export type NotificationsList = { items: AppNotification[]; pagination: { page: number; limit: number; total: number; total_pages: number } };
export type NotificationMeta = { modules: Array<{ code: string }> };

const moduleLabels: Record<string, string> = {
  craft_orders: 'Pesanan Craft', craft_production: 'Produksi Craft', craft_materials: 'Material Craft', craft_printers: 'Printer Craft', craft_procurement: 'Pengadaan Craft', craft_marketplace: 'Marketplace Craft', craft_finance: 'Keuangan Craft',
  studio_projects: 'Proyek Studio', studio_billing: 'Penagihan Studio', studio_equipment: 'Peralatan Studio', studio_finance: 'Keuangan Studio', users: 'Pengguna', automations: 'Otomasi',
};
const moduleIcons: Record<string, LucideIcon> = {
  craft_orders: ShoppingCart, craft_production: Layers, craft_materials: Box, craft_printers: Printer, craft_procurement: Package, craft_marketplace: ShoppingCart, craft_finance: CircleDollarSign,
  studio_projects: FolderKanban, studio_billing: FileText, studio_equipment: Package, studio_finance: CircleDollarSign, users: Users, automations: Zap,
};

export const notificationModuleLabel = (code?: string | null) => code ? moduleLabels[code] || code.replace(/_/g, ' ') : 'Sistem';
export const notificationModuleIcon = (code?: string | null) => code ? moduleIcons[code] || Bell : Bell;
export const severityLabel = (severity: NotificationSeverity) => ({ info: 'Info', success: 'Sukses', warning: 'Peringatan', error: 'Error', critical: 'Kritis' })[severity];
export const severityClasses = (severity: NotificationSeverity) => ({
  info: 'bg-blue-50 text-blue-700 border-blue-200', success: 'bg-emerald-50 text-emerald-700 border-emerald-200', warning: 'bg-amber-50 text-amber-800 border-amber-200', error: 'bg-red-50 text-red-700 border-red-200', critical: 'bg-red-100 text-red-800 border-red-300',
})[severity];

export const safeNotificationActionUrl = (value?: string | null) => {
  const url = value?.trim() || '';
  if (url.startsWith('/app/') && !url.startsWith('//')) return url;
  try { const parsed = new URL(url); return parsed.protocol === 'https:' ? parsed.toString() : null; }
  catch { return null; }
};

export const formatNotificationTime = (value: string) => new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(value));
export const relativeNotificationTime = (value: string) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'Baru saja';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} menit lalu`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} jam lalu`;
  if (seconds < 172800) return 'Kemarin';
  return `${Math.floor(seconds / 86400)} hari lalu`;
};
