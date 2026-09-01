import { google } from 'googleapis';
import type { IntegrationConnector } from '../integration-connector';
import { GOOGLE_REQUEST_OPTIONS, googleAuthFor, parseServiceAccountJson, sanitizeGoogleError } from './google-shared';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

export const googleSheetsConnector: IntegrationConnector = {
  providerCode: 'GOOGLE_SHEETS',
  integrationType: 'google',

  async testConnection(context) {
    const spreadsheetId = String(context.config.spreadsheet_id || '').trim();
    if (!spreadsheetId) return { connected: false, message: 'spreadsheet_id belum diisi.' };
    const secret = await context.getSecret('service_account_json');
    if (!secret) return { connected: false, message: 'Kredensial Service Account belum dikonfigurasi.' };
    try {
      const credentials = parseServiceAccountJson(secret);
      const auth = googleAuthFor(credentials, SCOPES);
      const sheets = google.sheets({ version: 'v4', auth });
      const response = await sheets.spreadsheets.get({ spreadsheetId, fields: 'properties.title' }, GOOGLE_REQUEST_OPTIONS);
      return { connected: true, message: 'Koneksi Google Sheets berhasil diverifikasi.', metadata: { spreadsheet_title: response.data.properties?.title } };
    } catch (error) {
      return { connected: false, message: sanitizeGoogleError(error) };
    }
  },
  // No sync(): Report Center remains canonical. A Report Center <-> Sheets export
  // mapping is a distinct domain feature that has not been built.
};
