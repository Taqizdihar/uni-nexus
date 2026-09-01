import type { IntegrationConnector } from '../integration-connector';
import { redactAuditDescription } from '../../audit/audit-redaction';

// Fixed, trusted host — built-in adapters never accept a client-supplied base URL.
const GRAPH_HOST = 'https://graph.facebook.com';
const DEFAULT_VERSION = 'v21.0';
const REQUEST_TIMEOUT_MS = 10_000;

export const whatsappCloudApiConnector: IntegrationConnector = {
  providerCode: 'WHATSAPP_CLOUD_API',
  integrationType: 'messaging',

  async testConnection(context) {
    const phoneNumberId = String(context.config.phone_number_id || '').trim();
    if (!phoneNumberId) return { connected: false, message: 'phone_number_id belum diisi.' };
    const version = String(context.config.graph_api_version || '').trim() || DEFAULT_VERSION;
    const accessToken = await context.getSecret('access_token');
    if (!accessToken) return { connected: false, message: 'Access token belum dikonfigurasi.' };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const url = `${GRAPH_HOST}/${encodeURIComponent(version)}/${encodeURIComponent(phoneNumberId)}?fields=verified_name,display_phone_number`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, signal: controller.signal });
      const body: any = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = body?.error?.message ? redactAuditDescription(String(body.error.message)) : `WhatsApp Graph API mengembalikan status ${response.status}.`;
        return { connected: false, message: message || 'Verifikasi nomor WhatsApp gagal.' };
      }
      return {
        connected: true,
        message: 'Koneksi WhatsApp Cloud API berhasil diverifikasi.',
        metadata: { verified_name: body.verified_name, display_phone_number: body.display_phone_number },
      };
    } catch (error: any) {
      return { connected: false, message: error?.name === 'AbortError' ? 'Permintaan ke WhatsApp Graph API melebihi batas waktu.' : 'Gagal menghubungi WhatsApp Graph API.' };
    } finally {
      clearTimeout(timeout);
    }
  },
  // No sync(): sending messages is a controlled automation action with explicit
  // recipient/template rules, not a generic Integration Center capability.
};
