import { Router, Request, Response } from 'express';
import { pool } from '../../config/database';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

// Get active customers (party with craft_customer role or general parties)
router.get('/customers', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const search = req.query.search as string;
    let query = `
      SELECT p.id, p.display_name, p.party_type, p.email, p.phone
      FROM parties p
      LEFT JOIN party_roles pr ON p.id = pr.party_id
      WHERE p.deleted_at IS NULL
    `;
    const params: any[] = [];
    
    if (search) {
      query += ` AND p.display_name LIKE ?`;
      params.push(`%${search}%`);
    }
    
    query += ` GROUP BY p.id ORDER BY p.display_name ASC LIMIT 50`;
    
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Failed to get customers:', error);
    res.status(500).json({ message: 'Gagal memuat data pelanggan' });
  }
});

// Get active craft products
router.get('/products', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.execute(`
      SELECT p.id, p.name, p.sku, p.base_price, p.status_code,
             v.id as variant_id, v.sku as variant_sku, v.name as variant_name, v.price_adjustment
      FROM products p
      LEFT JOIN product_variants v ON p.id = v.product_id AND v.status_code = 'active'
      WHERE p.status_code = 'active' AND p.deleted_at IS NULL
      ORDER BY p.name ASC
    `);
    
    const productsMap = new Map();
    (rows as any[]).forEach(row => {
      if (!productsMap.has(row.id)) {
        productsMap.set(row.id, {
          id: row.id,
          name: row.name,
          sku: row.sku,
          base_price: row.base_price,
          variants: []
        });
      }
      if (row.variant_id) {
        productsMap.get(row.id).variants.push({
          id: row.variant_id,
          sku: row.variant_sku,
          name: row.variant_name,
          price: Number(row.base_price) + Number(row.price_adjustment || 0)
        });
      }
    });
    
    res.json(Array.from(productsMap.values()));
  } catch (error) {
    console.error('Failed to get products:', error);
    res.status(500).json({ message: 'Gagal memuat data produk' });
  }
});

// Get sales channels
router.get('/sales-channels', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.execute(`
      SELECT id, name, channel_type, is_integrated 
      FROM sales_channels 
      WHERE is_active = 1 
      ORDER BY name ASC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat kanal penjualan' });
  }
});

// Get payment methods
router.get('/payment-methods', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.execute(`
      SELECT id, name, type 
      FROM payment_methods 
      WHERE is_active = 1 
      ORDER BY name ASC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat metode pembayaran' });
  }
});

// Get printers
router.get('/printers', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.execute(`
      SELECT id, name, model, status_code 
      FROM printers 
      WHERE status_code IN ('idle', 'busy', 'maintenance')
      ORDER BY name ASC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat data printer' });
  }
});

export const craftReferencesRoutes = router;
