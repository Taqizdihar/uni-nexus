import { Router, Request, Response } from 'express';
import { pool } from '../../config/database';
import { requireAuth, requirePermission } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../shared/utils/response';
import { AppError } from '../../shared/errors/AppError';
import { getCraftBusinessUnitId } from './craft-orders.helpers';

const router = Router();

// Get active customers (parties with craft_customer role or any party)
router.use(requireAuth, requirePermission('craft.orders.read'));

router.get('/customers', async (req: Request, res: Response, next): Promise<void> => {
  try {
    const search = req.query.search as string;
    const craftBuId = await getCraftBusinessUnitId();
    let query = `
      SELECT DISTINCT p.id, p.display_name, p.party_kind, p.email, p.phone, p.status_code
      FROM parties p
      JOIN party_roles pr ON p.id = pr.party_id
        AND pr.business_unit_id = ?
        AND pr.role_code = 'craft_customer'
        AND pr.is_active = 1
      WHERE p.deleted_at IS NULL
        AND p.status_code = 'active'
    `;
    const params: unknown[] = [craftBuId];

    if (search) {
      query += ` AND (p.display_name LIKE ? OR p.email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY p.display_name ASC LIMIT 100`;

    const [rows] = await pool.execute(query, params as any[]);
    sendSuccess(res, rows);
  } catch (error) {
    console.error('Failed to get customers:', error);
    next(error);
  }
});

// Get active craft products
router.get('/products', async (req: Request, res: Response, next): Promise<void> => {
  try {
    const craftBuId = await getCraftBusinessUnitId();

    const [rows] = await pool.execute(`
      SELECT
        p.id, p.name, p.sku, p.base_selling_price, p.estimated_cost,
        p.estimated_weight_g, p.estimated_print_minutes,
        v.id as variant_id, v.sku as variant_sku, v.name as variant_name,
        v.selling_price as variant_selling_price,
        v.estimated_cost as variant_estimated_cost,
        v.estimated_weight_g as variant_estimated_weight_g,
        v.estimated_print_minutes as variant_estimated_print_minutes
      FROM products p
      LEFT JOIN product_variants v ON p.id = v.product_id AND v.is_active = 1
      WHERE p.business_unit_id = ?
        AND p.is_active = 1
        AND p.deleted_at IS NULL
      ORDER BY p.name ASC
    `, [craftBuId]);

    const productsMap = new Map<number, any>();
    (rows as any[]).forEach(row => {
      if (!productsMap.has(row.id)) {
        productsMap.set(row.id, {
          id: row.id,
          name: row.name,
          sku: row.sku,
          base_selling_price: Number(row.base_selling_price),
          estimated_cost: row.estimated_cost ? Number(row.estimated_cost) : null,
          estimated_weight_g: row.estimated_weight_g ? Number(row.estimated_weight_g) : null,
          estimated_print_minutes: row.estimated_print_minutes || null,
          variants: []
        });
      }
      if (row.variant_id) {
        productsMap.get(row.id).variants.push({
          id: row.variant_id,
          sku: row.variant_sku,
          name: row.variant_name,
          selling_price: row.variant_selling_price !== null
            ? Number(row.variant_selling_price)
            : Number(row.base_selling_price),
          estimated_cost: row.variant_estimated_cost ? Number(row.variant_estimated_cost) : null,
          estimated_weight_g: row.variant_estimated_weight_g ? Number(row.variant_estimated_weight_g) : null,
          estimated_print_minutes: row.variant_estimated_print_minutes || null,
        });
      }
    });

    sendSuccess(res, Array.from(productsMap.values()));
  } catch (error) {
    console.error('Failed to get products:', error);
    next(error);
  }
});

// Get sales channels (Craft BU only)
router.get('/sales-channels', async (req: Request, res: Response, next): Promise<void> => {
  try {
    const craftBuId = await getCraftBusinessUnitId();
    const [rows] = await pool.execute(`
      SELECT id, name, channel_type, is_integrated 
      FROM sales_channels 
      WHERE business_unit_id = ? AND is_active = 1
      ORDER BY name ASC
    `, [craftBuId]);
    sendSuccess(res, rows);
  } catch (error) {
    next(error);
  }
});

// Get payment methods
router.get('/payment-methods', async (_req: Request, res: Response, next): Promise<void> => {
  try {
    const [rows] = await pool.execute(`
      SELECT id, code, name, method_type
      FROM payment_methods 
      WHERE is_active = 1 
      ORDER BY name ASC
    `);
    sendSuccess(res, rows);
  } catch (error) {
    next(error);
  }
});

// Get printers (Craft BU, active)
router.get('/printers', async (_req: Request, res: Response, next): Promise<void> => {
  try {
    const craftBuId = await getCraftBusinessUnitId();
    const [rows] = await pool.execute(`
      SELECT id, name, brand, model, printer_type, status_code, location_name
      FROM printers 
      WHERE business_unit_id = ?
        AND is_active = 1
        AND deleted_at IS NULL
        AND status_code IN ('available', 'busy', 'maintenance', 'error', 'offline')
      ORDER BY name ASC
    `, [craftBuId]);
    sendSuccess(res, rows);
  } catch (error) {
    next(error);
  }
});

// Get treasury accounts (for payment recording)
router.get('/treasury-accounts', async (_req: Request, res: Response, next): Promise<void> => {
  try {
    const craftBuId = await getCraftBusinessUnitId();
    const [rows] = await pool.execute(
      `SELECT id, name FROM treasury_accounts
       WHERE is_active = 1 AND (business_unit_id = ? OR business_unit_id IS NULL)
       ORDER BY name ASC`,
      [craftBuId],
    );
    sendSuccess(res, rows);
  } catch (error) {
    next(error);
  }
});

// Get production queue (for queue management page)
router.get('/production-queue', async (_req: Request, res: Response, next): Promise<void> => {
  try {
    const craftBuId = await getCraftBusinessUnitId();
    const [rows] = await pool.execute(`
      SELECT
        pqi.id, pqi.queue_position, pqi.priority_code, pqi.priority_score,
        pqi.status_code, pqi.scheduled_start_at, pqi.scheduled_end_at, pqi.notes,
        pqi.order_id, o.order_code, o.deadline_at,
        p.display_name as customer_name,
        coi.item_name, coi.quantity, coi.estimated_print_minutes
      FROM production_queue_items pqi
      JOIN craft_orders o ON pqi.order_id = o.id
      JOIN parties p ON o.customer_party_id = p.id
      JOIN craft_order_items coi ON pqi.order_item_id = coi.id
      WHERE pqi.business_unit_id = ?
        AND pqi.status_code NOT IN ('completed', 'cancelled')
      ORDER BY pqi.queue_position ASC
    `, [craftBuId]);
    sendSuccess(res, rows);
  } catch (error) {
    next(error);
  }
});

export const craftReferencesRoutes = router;
