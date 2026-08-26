import { pool } from '../../config/database';

type SqlConnection = Awaited<ReturnType<typeof pool.getConnection>>;

export interface ResolvedPartnerPrice {
  rule_id: number;
  product_id: number;
  variant_id: number | null;
  minimum_qty: number;
  normal_price: number;
  resolved_price: number;
  special_price: number | null;
  discount_percent: number | null;
}

/** Resolves current Craft partner pricing without mutating a product or historical order. */
export class PartnerPricingService {
  async resolve(connection: SqlConnection, partnerPartyId: number, productId: number, variantId: number | null, quantity: number, businessUnitId: number): Promise<ResolvedPartnerPrice | null> {
    const [rows]: any = await connection.execute(
      `SELECT r.id AS rule_id, r.product_id, r.variant_id, r.minimum_qty, r.special_price, r.discount_percent,
              COALESCE(v.selling_price, p.base_selling_price) AS normal_price
       FROM partner_price_rules r
       JOIN products p ON p.id = r.product_id AND p.business_unit_id = ? AND p.is_active = 1 AND p.deleted_at IS NULL
       LEFT JOIN product_variants v ON v.id = r.variant_id AND v.product_id = p.id AND v.is_active = 1
       JOIN party_roles partner_role ON partner_role.party_id = r.partner_party_id
         AND partner_role.business_unit_id = ? AND partner_role.role_code = 'craft_partner'
         AND partner_role.is_active = 1
         AND (partner_role.valid_from IS NULL OR partner_role.valid_from <= UTC_DATE())
         AND (partner_role.valid_until IS NULL OR partner_role.valid_until >= UTC_DATE())
       WHERE r.partner_party_id = ? AND r.product_id = ?
         AND (r.variant_id IS NULL OR r.variant_id = ?)
         AND r.is_active = 1 AND r.minimum_qty <= ?
         AND (r.valid_from IS NULL OR r.valid_from <= UTC_DATE())
         AND (r.valid_until IS NULL OR r.valid_until >= UTC_DATE())
       ORDER BY (r.variant_id IS NOT NULL) DESC, r.minimum_qty DESC, r.id DESC
       LIMIT 1`,
      [businessUnitId, businessUnitId, partnerPartyId, productId, variantId, quantity],
    );
    if (!rows.length) return null;
    const rule = rows[0];
    const normalPrice = Number(rule.normal_price || 0);
    const resolvedPrice = rule.special_price !== null
      ? Number(rule.special_price)
      : Math.max(0, normalPrice * (1 - Number(rule.discount_percent || 0) / 100));
    return {
      rule_id: Number(rule.rule_id), product_id: Number(rule.product_id), variant_id: rule.variant_id === null ? null : Number(rule.variant_id),
      minimum_qty: Number(rule.minimum_qty), normal_price: normalPrice, resolved_price: resolvedPrice,
      special_price: rule.special_price === null ? null : Number(rule.special_price),
      discount_percent: rule.discount_percent === null ? null : Number(rule.discount_percent),
    };
  }

  async resolveWithPool(partnerPartyId: number, productId: number, variantId: number | null, quantity: number, businessUnitId: number) {
    const connection = await pool.getConnection();
    try {
      return await this.resolve(connection, partnerPartyId, productId, variantId, quantity, businessUnitId);
    } finally {
      connection.release();
    }
  }
}
