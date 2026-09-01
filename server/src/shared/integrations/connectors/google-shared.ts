import { google } from 'googleapis';
import { redactAuditDescription } from '../../audit/audit-redaction';

const REQUEST_TIMEOUT_MS = 10_000;

export interface GoogleServiceAccountCredentials {
  client_email: string;
  private_key: string;
}

/** Parses and minimally validates the service-account JSON secret without ever logging it. */
export function parseServiceAccountJson(raw: string): GoogleServiceAccountCredentials {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Format Service Account JSON tidak valid.');
  }
  const credentials = parsed as Partial<GoogleServiceAccountCredentials>;
  if (!credentials.client_email || !credentials.private_key) {
    throw new Error('Service Account JSON harus memiliki client_email dan private_key.');
  }
  return credentials as GoogleServiceAccountCredentials;
}

export function googleAuthFor(credentials: GoogleServiceAccountCredentials, scopes: string[]) {
  return new google.auth.JWT({ email: credentials.client_email, key: credentials.private_key, scopes });
}

export const GOOGLE_REQUEST_OPTIONS = { timeout: REQUEST_TIMEOUT_MS };

/** Google API errors can embed request context; strip anything that looks like a credential before it reaches a log or the UI. */
export function sanitizeGoogleError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return redactAuditDescription(raw) || 'Permintaan ke Google API gagal.';
}
