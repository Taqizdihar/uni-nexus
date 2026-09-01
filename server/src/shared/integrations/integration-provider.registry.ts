import './connectors';
import { env } from '../../config/env';
import { integrationConnectorRegistry } from './integration-connector.registry';

export type ProviderCategory = 'google_workspace' | 'messaging' | 'marketplace' | 'payment' | 'api_webhook' | 'other';
export type ProviderAvailability = 'available' | 'planned';
export type ProviderScope = 'organization' | 'craft' | 'studio';
export type ProviderAuthMode = 'service_account' | 'access_token' | 'none';

export interface ProviderConfigField {
  name: string;
  label: string;
  type: 'text' | 'url' | 'select';
  required?: boolean;
  helpText?: string;
  options?: Array<{ value: string; label: string }>;
}

export interface ProviderSecretField {
  name: string;
  label: string;
  required?: boolean;
  multiline?: boolean;
  helpText?: string;
}

export interface ProviderDefinition {
  code: string;
  displayName: string;
  integrationType: string;
  description: string;
  category: ProviderCategory;
  availability: ProviderAvailability;
  allowedScopes: ProviderScope[];
  capabilities: { test: boolean; sync: boolean };
  publicConfigFields: ProviderConfigField[];
  secretFields: ProviderSecretField[];
  authMode: ProviderAuthMode;
  unavailableReason?: string;
  /** Never surfaced outside development/test — filtered out of the catalog in production. */
  devOnly?: boolean;
}

const PLANNED_ADAPTER_MESSAGE = 'Adapter API belum tersedia / belum dikonfigurasi.';

const PROVIDERS: ProviderDefinition[] = [
  {
    code: 'GOOGLE_DRIVE',
    displayName: 'Google Drive',
    integrationType: 'google',
    description: 'Verifikasi akses folder Google Drive menggunakan Service Account.',
    category: 'google_workspace',
    availability: 'available',
    allowedScopes: ['organization', 'craft', 'studio'],
    capabilities: { test: true, sync: false },
    publicConfigFields: [{ name: 'folder_id', label: 'Folder ID', type: 'text', required: true, helpText: 'ID folder Google Drive tujuan.' }],
    secretFields: [{ name: 'service_account_json', label: 'Service Account JSON', required: true, multiline: true, helpText: 'Kredensial service account Google Cloud (JSON), disimpan terenkripsi.' }],
    authMode: 'service_account',
  },
  {
    code: 'GOOGLE_SHEETS',
    displayName: 'Google Sheets',
    integrationType: 'google',
    description: 'Verifikasi akses spreadsheet Google Sheets menggunakan Service Account.',
    category: 'google_workspace',
    availability: 'available',
    allowedScopes: ['organization', 'craft', 'studio'],
    capabilities: { test: true, sync: false },
    publicConfigFields: [{ name: 'spreadsheet_id', label: 'Spreadsheet ID', type: 'text', required: true }],
    secretFields: [{ name: 'service_account_json', label: 'Service Account JSON', required: true, multiline: true, helpText: 'Kredensial service account Google Cloud (JSON), disimpan terenkripsi.' }],
    authMode: 'service_account',
  },
  {
    code: 'GOOGLE_CALENDAR',
    displayName: 'Google Calendar',
    integrationType: 'google',
    description: 'Verifikasi akses kalender Google Calendar menggunakan Service Account.',
    category: 'google_workspace',
    availability: 'available',
    allowedScopes: ['organization', 'craft', 'studio'],
    capabilities: { test: true, sync: false },
    publicConfigFields: [{ name: 'calendar_id', label: 'Calendar ID', type: 'text', required: true }],
    secretFields: [{ name: 'service_account_json', label: 'Service Account JSON', required: true, multiline: true, helpText: 'Kredensial service account Google Cloud (JSON), disimpan terenkripsi.' }],
    authMode: 'service_account',
  },
  {
    code: 'WHATSAPP_CLOUD_API',
    displayName: 'WhatsApp Cloud API',
    integrationType: 'messaging',
    description: 'Verifikasi nomor WhatsApp Business melalui Meta Graph API.',
    category: 'messaging',
    availability: 'available',
    allowedScopes: ['organization', 'craft', 'studio'],
    capabilities: { test: true, sync: false },
    publicConfigFields: [
      { name: 'phone_number_id', label: 'Phone Number ID', type: 'text', required: true },
      { name: 'business_account_id', label: 'Business Account ID', type: 'text' },
      { name: 'graph_api_version', label: 'Graph API Version', type: 'text', helpText: 'Contoh: v21.0. Kosongkan untuk memakai versi default.' },
    ],
    secretFields: [{ name: 'access_token', label: 'Access Token', required: true, helpText: 'Token akses WhatsApp Cloud API, disimpan terenkripsi.' }],
    authMode: 'access_token',
  },
  {
    code: 'SHOPEE',
    displayName: 'Shopee',
    integrationType: 'marketplace',
    description: 'Integrasi API Shopee untuk sinkronisasi pesanan dan produk.',
    category: 'marketplace',
    availability: 'planned',
    allowedScopes: ['craft'],
    capabilities: { test: false, sync: false },
    publicConfigFields: [],
    secretFields: [],
    authMode: 'none',
    unavailableReason: PLANNED_ADAPTER_MESSAGE,
  },
  {
    code: 'TIKTOK_SHOP',
    displayName: 'TikTok Shop',
    integrationType: 'marketplace',
    description: 'Integrasi API TikTok Shop untuk sinkronisasi pesanan dan produk.',
    category: 'marketplace',
    availability: 'planned',
    allowedScopes: ['craft'],
    capabilities: { test: false, sync: false },
    publicConfigFields: [],
    secretFields: [],
    authMode: 'none',
    unavailableReason: PLANNED_ADAPTER_MESSAGE,
  },
  {
    code: 'TOKOPEDIA',
    displayName: 'Tokopedia',
    integrationType: 'marketplace',
    description: 'Integrasi API Tokopedia untuk sinkronisasi pesanan dan produk.',
    category: 'marketplace',
    availability: 'planned',
    allowedScopes: ['craft'],
    capabilities: { test: false, sync: false },
    publicConfigFields: [],
    secretFields: [],
    authMode: 'none',
    unavailableReason: PLANNED_ADAPTER_MESSAGE,
  },
  {
    code: 'PAYMENT_GATEWAY',
    displayName: 'Payment Gateway',
    integrationType: 'payment',
    description: 'Kategori adapter payment gateway. Belum ada adapter terverifikasi pada rilis ini.',
    category: 'payment',
    availability: 'planned',
    allowedScopes: ['organization', 'craft', 'studio'],
    capabilities: { test: false, sync: false },
    publicConfigFields: [],
    secretFields: [],
    authMode: 'none',
    unavailableReason: PLANNED_ADAPTER_MESSAGE,
  },
  {
    code: 'CUSTOM_API',
    displayName: 'Custom API / Generic Webhook',
    integrationType: 'api',
    description: 'Koneksi ke URL/API kustom. Ditahan sebagai "planned" karena hardening SSRF (blokir localhost/private network/metadata cloud, validasi DNS, batas redirect/timeout/ukuran) belum diimplementasikan secara menyeluruh pada rilis ini.',
    category: 'api_webhook',
    availability: 'planned',
    allowedScopes: ['organization', 'craft', 'studio'],
    capabilities: { test: false, sync: false },
    publicConfigFields: [],
    secretFields: [],
    authMode: 'none',
    unavailableReason: PLANNED_ADAPTER_MESSAGE,
  },
  {
    code: 'MOCK_TEST_CONNECTOR',
    displayName: 'Mock Test Connector (Development Only)',
    integrationType: 'other',
    description: 'Connector simulasi untuk smoke test dan browser acceptance test. Tidak pernah tersedia di production.',
    category: 'other',
    availability: 'available',
    allowedScopes: ['organization', 'craft', 'studio'],
    capabilities: { test: true, sync: true },
    publicConfigFields: [{ name: 'simulate', label: 'Simulasi', type: 'select', options: [{ value: 'success', label: 'Berhasil' }, { value: 'fail', label: 'Gagal' }] }],
    secretFields: [{ name: 'dummy_secret', label: 'Dummy Secret' }],
    authMode: 'none',
    devOnly: true,
  },
];

/** Provider catalog for the given process — excludes devOnly providers in production. */
export function listProviders(): ProviderDefinition[] {
  return PROVIDERS.filter((provider) => !provider.devOnly || env.NODE_ENV !== 'production');
}

export function getProvider(code: string): ProviderDefinition | undefined {
  return listProviders().find((provider) => provider.code === String(code || '').toUpperCase());
}

/** True only when a definition exists AND a real connector is actually registered for it. */
export function isProviderConnectable(code: string): boolean {
  const provider = getProvider(code);
  if (!provider || provider.availability !== 'available') return false;
  return integrationConnectorRegistry.isAvailable(provider.integrationType, provider.code);
}
