import type { NotificationSeverity } from '../../shared/notifications/notification.service';

export type NotificationStatusFilter = 'all' | 'unread' | 'read';
export type NotificationWorkspaceFilter = 'all' | 'craft' | 'studio' | 'global';

export type NotificationListFilters = {
  status: NotificationStatusFilter;
  workspace: NotificationWorkspaceFilter;
  severity: 'all' | NotificationSeverity;
  module?: string;
  q?: string;
  page: number;
  limit: number;
};

export type NotificationMeta = {
  modules: Array<{ code: string }>;
};
