import type { Prisma } from '@prisma/client';
import { AppError } from '../lib/errors.js';

export interface NotificationMessage { workspaceId: bigint; recipientUserId: bigint; event: string; title: string; message?: string; entityType?: string; entityId?: bigint }
export interface NotificationProvider { readonly channel: string; send(message: NotificationMessage): Promise<void> }
export class InAppNotificationProvider implements NotificationProvider {
  readonly channel = 'IN_APP';
  constructor(private readonly db: Prisma.TransactionClient) {}
  async send(message: NotificationMessage): Promise<void> {
    const setting = await this.db.notification_settings.findFirst({ where: { workspace_id: message.workspaceId, event_key: message.event, channel: 'IN_APP' } });
    if (setting && !setting.is_enabled) return;
    const member = await this.db.workspace_members.findFirst({ where: { workspace_id: message.workspaceId, user_id: message.recipientUserId, membership_status: 'ACTIVE' } });
    if (!member) return;
    await this.db.notifications.create({ data: { workspace_id: message.workspaceId, recipient_user_id: message.recipientUserId, event_type: message.event, title: message.title, message: message.message, entity_type: message.entityType, entity_id: message.entityId } });
  }
}
/** External delivery deliberately fails until a real provider is installed. */
export class UnconfiguredNotificationProvider implements NotificationProvider {
  constructor(readonly channel: 'EMAIL' | 'WHATSAPP') {}
  async send(_message: NotificationMessage): Promise<void> {
    throw new AppError(503, `${this.channel} delivery is not configured.`, 'PROVIDER_NOT_CONFIGURED');
  }
}
