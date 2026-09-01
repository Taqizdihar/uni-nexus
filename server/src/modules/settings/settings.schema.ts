import { z } from 'zod';

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
const currencyCodes = ['IDR', 'USD', 'EUR', 'SGD', 'MYR', 'GBP', 'JPY', 'CNY', 'AUD', 'CAD'] as const;
const timeZones = new Set(Intl.supportedValuesOf('timeZone'));

export const organizationUpdateSchema = z.object({
  name: z.string().trim().min(1, 'Nama organisasi wajib diisi.').max(150).optional(), legal_name: optionalText(200),
  email: z.string().trim().email('Email organisasi tidak valid.').max(190).nullable().optional(), phone: optionalText(50), address: optionalText(4000),
  city: optionalText(100), province: optionalText(100), postal_code: optionalText(20),
  country_code: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, 'Kode negara harus ISO dua huruf.').optional(),
  currency_code: z.enum(currencyCodes, { message: 'Mata uang organisasi tidak didukung.' }).optional(),
  timezone: z.string().trim().max(64).refine(value => timeZones.has(value), 'Zona waktu IANA tidak valid.').optional(),
}).refine(value => Object.keys(value).length > 0, { message: 'Tidak ada perubahan organisasi yang dikirim.' });

export const groupUpdateSchema = z.object({ values: z.record(z.string(), z.unknown()) }).refine(value => Object.keys(value.values).length > 0, { message: 'Minimal satu nilai pengaturan diperlukan.' });
