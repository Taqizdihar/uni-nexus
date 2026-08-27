import { z } from 'zod';

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
const pricingModel = z.enum(['fixed', 'hourly', 'daily', 'package', 'custom']);
const nonNegativeMoney = z.coerce.number().finite().min(0, 'Harga tidak boleh negatif.').max(9999999999999999.99);
const positiveId = z.coerce.number().int().positive();

export const createServiceSchema = z.object({
  name: z.string().trim().min(1, 'Nama layanan wajib diisi.').max(180),
  category_id: positiveId.nullable().optional(),
  description: optionalText(8000),
  pricing_model: pricingModel.default('fixed'),
  base_price: nonNegativeMoney.default(0),
  unit_label: optionalText(60),
  is_active: z.boolean().default(true),
});

export const updateServiceSchema = z.object({
  name: z.string().trim().min(1, 'Nama layanan wajib diisi.').max(180).optional(),
  category_id: positiveId.nullable().optional(),
  description: optionalText(8000),
  pricing_model: pricingModel.optional(),
  base_price: nonNegativeMoney.optional(),
  unit_label: optionalText(60),
}).refine(value => Object.keys(value).length > 0, { message: 'Tidak ada perubahan layanan yang dikirim.' });

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Nama kategori wajib diisi.').max(120),
  code: z.string().trim().max(50).optional(),
  is_active: z.boolean().default(true),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1, 'Nama kategori wajib diisi.').max(120).optional(),
}).refine(value => Object.keys(value).length > 0, { message: 'Tidak ada perubahan kategori yang dikirim.' });

export const packageItemSchema = z.object({
  service_id: positiveId,
  quantity: z.coerce.number().finite().positive('Jumlah layanan harus lebih besar dari 0.').max(99999999999999.9999),
  notes: optionalText(500),
});

const packageFields = {
  name: z.string().trim().min(1, 'Nama paket wajib diisi.').max(180),
  description: optionalText(8000),
  package_price: nonNegativeMoney,
  items: z.array(packageItemSchema).max(100),
};

export const createPackageSchema = z.object({ ...packageFields, is_active: z.boolean().default(true) });
export const updatePackageSchema = z.object({
  name: packageFields.name.optional(),
  description: packageFields.description,
  package_price: packageFields.package_price.optional(),
  items: packageFields.items.optional(),
}).refine(value => Object.keys(value).length > 0, { message: 'Tidak ada perubahan paket yang dikirim.' });

export const deactivateCategorySchema = z.object({ confirm_active_services: z.boolean().default(false) });
