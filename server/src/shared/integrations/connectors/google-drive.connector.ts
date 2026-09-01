import { google } from 'googleapis';
import type { IntegrationConnector } from '../integration-connector';
import { GOOGLE_REQUEST_OPTIONS, googleAuthFor, parseServiceAccountJson, sanitizeGoogleError } from './google-shared';

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

export const googleDriveConnector: IntegrationConnector = {
  providerCode: 'GOOGLE_DRIVE',
  integrationType: 'google',

  async testConnection(context) {
    const folderId = String(context.config.folder_id || '').trim();
    if (!folderId) return { connected: false, message: 'folder_id belum diisi.' };
    const secret = await context.getSecret('service_account_json');
    if (!secret) return { connected: false, message: 'Kredensial Service Account belum dikonfigurasi.' };
    try {
      const credentials = parseServiceAccountJson(secret);
      const auth = googleAuthFor(credentials, SCOPES);
      const drive = google.drive({ version: 'v3', auth });
      const response = await drive.files.get({ fileId: folderId, fields: 'id,name,mimeType' }, GOOGLE_REQUEST_OPTIONS);
      if (response.data.mimeType !== 'application/vnd.google-apps.folder') {
        return { connected: false, message: 'ID yang dikonfigurasi bukan folder Google Drive.' };
      }
      return { connected: true, message: 'Koneksi Google Drive berhasil diverifikasi.', metadata: { folder_name: response.data.name } };
    } catch (error) {
      return { connected: false, message: sanitizeGoogleError(error) };
    }
  },
  // No sync(): UNI-NEXUS Document Center remains canonical. Drive↔Document Center
  // synchronization is a distinct domain feature (ownership, idempotency, loop
  // prevention) that has not been built, so sync stays honestly unavailable.
};
