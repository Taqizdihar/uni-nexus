import { google } from 'googleapis';
import type { IntegrationConnector } from '../integration-connector';
import { GOOGLE_REQUEST_OPTIONS, googleAuthFor, parseServiceAccountJson, sanitizeGoogleError } from './google-shared';

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

export const googleCalendarConnector: IntegrationConnector = {
  providerCode: 'GOOGLE_CALENDAR',
  integrationType: 'google',

  async testConnection(context) {
    const calendarId = String(context.config.calendar_id || '').trim();
    if (!calendarId) return { connected: false, message: 'calendar_id belum diisi.' };
    const secret = await context.getSecret('service_account_json');
    if (!secret) return { connected: false, message: 'Kredensial Service Account belum dikonfigurasi.' };
    try {
      const credentials = parseServiceAccountJson(secret);
      const auth = googleAuthFor(credentials, SCOPES);
      const calendar = google.calendar({ version: 'v3', auth });
      const response = await calendar.calendars.get({ calendarId }, GOOGLE_REQUEST_OPTIONS);
      return { connected: true, message: 'Koneksi Google Calendar berhasil diverifikasi.', metadata: { calendar_summary: response.data.summary } };
    } catch (error) {
      return { connected: false, message: sanitizeGoogleError(error) };
    }
  },
  // No sync(): UNI-NEXUS Calendar remains canonical. Two-way Calendar<->Google
  // Calendar sync (ownership, stable external-event mapping, loop prevention)
  // is a distinct domain feature that has not been built.
};
