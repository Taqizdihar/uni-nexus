import { readFile } from 'node:fs/promises';
import { pool } from '../../config/database';
import { settingsService } from '../settings/settings.service';
import { storageService } from '../storage';

export type DocumentBranding = {
  name: string;
  legalName: string | null;
  contact: string[];
  footerText: string | null;
  showContact: boolean;
  showLogo: boolean;
  logo: Buffer | null;
};

export class DocumentBrandingService {
  async resolve(organizationId: number): Promise<DocumentBranding> {
    const [[rows], footerText, showContact, showLogo] = await Promise.all([
      pool.execute<any[]>('SELECT name,legal_name,email,phone,address,city,province,postal_code,logo_path FROM organizations WHERE id=? LIMIT 1', [organizationId]),
      settingsService.value<string | null>(organizationId, 'organization', 'documents', 'pdf_footer_text'),
      settingsService.value<boolean>(organizationId, 'organization', 'documents', 'show_organization_contact'),
      settingsService.value<boolean>(organizationId, 'organization', 'documents', 'show_organization_logo'),
    ]);
    const row = rows[0] || {};
    let logo: Buffer | null = null;
    if (showLogo && row.logo_path && await storageService.exists(row.logo_path).catch(() => false)) logo = await readFile(storageService.safeResolve(row.logo_path)).catch(() => null);
    const address = [row.address, row.city, row.province, row.postal_code].filter(Boolean).join(', ');
    return { name: row.name || 'UNI-NEXUS', legalName: row.legal_name || null, contact: [row.email, row.phone, address].filter(Boolean), footerText, showContact, showLogo, logo };
  }
}

export const documentBrandingService = new DocumentBrandingService();
