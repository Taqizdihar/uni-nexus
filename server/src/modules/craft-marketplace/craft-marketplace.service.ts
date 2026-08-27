import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { parse as parseCsv } from 'csv-parse/sync';
import ExcelJS from 'exceljs';
import { pool } from '../../config/database';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import { FinancePostingService } from '../../shared/finance/finance-posting.service';
import { CraftOrdersService } from '../craft-orders/craft-orders.service';
import { marketplaceConnectorRegistry } from '../../shared/integrations/marketplace/MarketplaceConnectorRegistry';
import type { ImportColumnMapping, NormalizedImportItem, NormalizedImportOrder } from './craft-marketplace.types';

type Connection = Awaited<ReturnType<typeof pool.getConnection>>;

interface ImportPreviewRecord {
  token: string;
  userId: number;
  channelId: number;
  filename: string;
  filePath: string;
  expiresAt: number;
  mapping: ImportColumnMapping;
  orders: NormalizedImportOrder[];
}

const IMPORT_ROOT = path.resolve(__dirname, '../../../storage/tmp/marketplace');
const IMPORT_EXPIRY_MS = 45 * 60 * 1000;
const MAX_IMPORT_ROWS = 5000;
const importPreviews = new Map<string, ImportPreviewRecord>();
const money = (value: unknown) => Number(value || 0);
const dateNow = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const safeJson = (value: unknown): Record<string, unknown> => {
  if (!value) return {};
  if (typeof value === 'object') return value as Record<string, unknown>;
  try { return JSON.parse(String(value)); } catch { return {}; }
};
const cleanText = (value: unknown) => String(value ?? '').trim() || null;
const normalizedHeader = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
const isDriverDuplicate = (error: unknown) => (error as { code?: string })?.code === 'ER_DUP_ENTRY';

const headerAliases: Record<keyof ImportColumnMapping, string[]> = {
  external_order_id: ['externalorderid', 'orderid', 'nomorpesanan', 'idpesanan', 'ordercode'],
  order_date: ['orderdate', 'tanggalpesanan', 'tanggalorder', 'createdat'],
  customer_name: ['customername', 'buyername', 'namapelanggan', 'namapembeli'],
  customer_email: ['customeremail', 'buyeremail', 'emailpelanggan', 'emailpembeli'],
  customer_phone: ['customerphone', 'buyerphone', 'phone', 'telepon', 'nomorhp'],
  recipient_name: ['recipientname', 'namapenerima'],
  recipient_phone: ['recipientphone', 'teleponpenerima', 'nomorhppenerima'],
  shipping_address: ['shippingaddress', 'alamatpengiriman', 'address'],
  courier: ['courier', 'kurir', 'shippingprovider'],
  deadline: ['deadline', 'tenggat', 'deadlineat'],
  external_product_id: ['externalproductid', 'productid', 'idproduk'],
  external_sku: ['externalsku', 'sku', 'skuproduk'],
  item_name: ['itemname', 'productname', 'namaitem', 'namaproduk'],
  quantity: ['quantity', 'qty', 'jumlah'],
  unit_price: ['unitprice', 'harga', 'hargasatuan', 'price'],
  item_discount: ['itemdiscount', 'diskonitem'],
  order_discount: ['orderdiscount', 'diskonpesanan'],
  shipping_amount: ['shippingamount', 'ongkoskirim', 'shippingfee'],
  marketplace_fee: ['marketplacefee', 'biayamarketplace', 'platformfee'],
  tax: ['tax', 'pajak'],
  external_order_total: ['externalordertotal', 'ordertotal', 'totalpesanan', 'total'],
};

function parseMoney(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : Number.NaN;
  let raw = String(value ?? '').trim();
  if (!raw) return 0;
  raw = raw.replace(/[^0-9,.-]/g, '');
  const comma = raw.lastIndexOf(',');
  const dot = raw.lastIndexOf('.');
  if (comma >= 0 && dot >= 0) raw = comma > dot ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(/,/g, '');
  else if (comma >= 0) raw = raw.replace(',', '.');
  else if (/\.\d{3}$/.test(raw)) raw = raw.replace(/\./g, '');
  const result = Number(raw);
  return Number.isFinite(result) ? result : Number.NaN;
}

function parseImportDate(value: unknown): string | null {
  const raw = cleanText(value);
  if (!raw) return null;
  const ddmmyyyy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (ddmmyyyy) {
    const [, day, month, year, hour = '00', minute = '00', second = '00'] = ddmmyyyy;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)));
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 19).replace('T', ' ');
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 19).replace('T', ' ');
}

function pickRowValue(row: Record<string, unknown>, header?: string) {
  return header ? row[header] : null;
}

export class CraftMarketplaceService {
  private readonly ordersService = new CraftOrdersService();
  private readonly financePosting = new FinancePostingService();

  private async audit(connection: Connection, context: { organizationId: number; businessUnitId: number; userId: number }, action: string, entityType: string, entityId: number | null, entityCode: string | null, description: string, values?: Record<string, unknown>) {
    await connection.execute(
      `INSERT INTO audit_logs (organization_id,business_unit_id,user_id,module_code,action_code,entity_type,entity_id,entity_code,description,new_values)
       VALUES (?,?,?,'craft_marketplace',?,?,?,?,?,?)`,
      [context.organizationId, context.businessUnitId, context.userId, action, entityType, entityId, entityCode, description, values ? JSON.stringify(values) : null],
    );
  }

  private async withTransaction<T>(work: (connection: Connection) => Promise<T>) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const result = await work(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  private async channel(connection: Connection, channelId: number, businessUnitId: number, options: { marketplaceOnly?: boolean; activeOnly?: boolean } = {}) {
    const clauses = ['id=?', 'business_unit_id=?'];
    if (options.marketplaceOnly) clauses.push("channel_type='marketplace'");
    if (options.activeOnly) clauses.push('is_active=1');
    const [rows]: any = await connection.execute(`SELECT * FROM sales_channels WHERE ${clauses.join(' AND ')} LIMIT 1`, [channelId, businessUnitId]);
    if (!rows.length) throw new AppError(404, 'SALES_CHANNEL_NOT_FOUND', 'Kanal penjualan tidak ditemukan.');
    return rows[0];
  }

  private async refreshChannelIntegrationState(connection: Connection, channelId: number) {
    const [rows]: any = await connection.execute(
      `SELECT COUNT(*) AS connected_count FROM integrations
       WHERE sales_channel_id=? AND integration_type='marketplace' AND status_code='connected'
         AND JSON_UNQUOTE(JSON_EXTRACT(config_json, '$.mode'))='api'`,
      [channelId],
    );
    await connection.execute('UPDATE sales_channels SET is_integrated=? WHERE id=?', [Number(rows[0].connected_count) > 0 ? 1 : 0, channelId]);
  }

  async getOverview(businessUnitId: number) {
    const [channels]: any = await pool.execute(
      `SELECT sc.*, COUNT(o.id) AS order_count,
              COALESCE(SUM(CASE WHEN o.order_date >= DATE_FORMAT(UTC_DATE(), '%Y-%m-01') THEN o.total_amount ELSE 0 END),0) AS month_order_value,
              MAX(i.last_sync_at) AS last_api_sync,
              SUM(CASE WHEN i.status_code='connected' AND JSON_UNQUOTE(JSON_EXTRACT(i.config_json,'$.mode'))='api' THEN 1 ELSE 0 END) AS connected_api_count
       FROM sales_channels sc
       LEFT JOIN craft_orders o ON o.sales_channel_id=sc.id AND o.deleted_at IS NULL
       LEFT JOIN integrations i ON i.sales_channel_id=sc.id AND i.integration_type='marketplace'
       WHERE sc.business_unit_id=? GROUP BY sc.id ORDER BY sc.channel_type='marketplace' DESC, sc.name`,
      [businessUnitId],
    );
    const [kpiRows]: any = await pool.execute(
      `SELECT
        (SELECT COUNT(*) FROM sales_channels WHERE business_unit_id=? AND is_active=1) AS active_channels,
        (SELECT COUNT(*) FROM sales_channels WHERE business_unit_id=? AND channel_type='marketplace' AND is_active=1) AS marketplace_channels,
        (SELECT COUNT(*) FROM integrations WHERE business_unit_id=? AND integration_type='marketplace' AND status_code='connected' AND JSON_UNQUOTE(JSON_EXTRACT(config_json,'$.mode'))='api') AS connected_apis,
        (SELECT COUNT(*) FROM craft_orders o JOIN sales_channels sc ON sc.id=o.sales_channel_id WHERE o.business_unit_id=? AND sc.channel_type='marketplace' AND o.order_date>=DATE_FORMAT(UTC_DATE(),'%Y-%m-01') AND o.deleted_at IS NULL) AS marketplace_orders_this_month,
        (SELECT COUNT(*) FROM marketplace_settlements ms JOIN sales_channels sc ON sc.id=ms.sales_channel_id WHERE sc.business_unit_id=? AND ms.status_code!='reconciled') AS unreconciled_settlements`,
      [businessUnitId, businessUnitId, businessUnitId, businessUnitId, businessUnitId],
    );
    const [unmapped]: any = await pool.execute(
      `SELECT COUNT(*) AS count FROM channel_product_mappings cpm
       JOIN sales_channels sc ON sc.id=cpm.sales_channel_id WHERE sc.business_unit_id=? AND cpm.sync_status_code IN ('pending','error')`,
      [businessUnitId],
    );
    return { kpis: { ...kpiRows[0], unmapped_products: Number(unmapped[0].count) }, channels };
  }

  async listChannels(businessUnitId: number) {
    const [rows]: any = await pool.execute(
      `SELECT sc.*, COUNT(o.id) AS order_count,
              COALESCE(SUM(CASE WHEN o.order_date >= DATE_FORMAT(UTC_DATE(), '%Y-%m-01') THEN o.total_amount ELSE 0 END),0) AS month_order_value,
              MAX(i.last_sync_at) AS last_api_sync,
              SUM(CASE WHEN i.status_code='connected' AND JSON_UNQUOTE(JSON_EXTRACT(i.config_json,'$.mode'))='api' THEN 1 ELSE 0 END) AS connected_api_count
       FROM sales_channels sc
       LEFT JOIN craft_orders o ON o.sales_channel_id=sc.id AND o.deleted_at IS NULL
       LEFT JOIN integrations i ON i.sales_channel_id=sc.id AND i.integration_type='marketplace'
       WHERE sc.business_unit_id=? GROUP BY sc.id ORDER BY sc.name`,
      [businessUnitId],
    );
    return rows;
  }

  async getChannelDetail(channelId: number, businessUnitId: number) {
    const connection = await pool.getConnection();
    try {
      const channel = await this.channel(connection, channelId, businessUnitId);
      const [[summaryRows], [orders], [mappings], [fees], [settlements], [integrations]]: any = await Promise.all([
        connection.execute(`SELECT COUNT(*) AS order_count, SUM(status_code NOT IN ('completed','cancelled','returned','shipped')) AS active_orders, SUM(status_code='completed') AS completed_orders, SUM(status_code='cancelled') AS cancelled_orders, SUM(status_code='returned') AS returned_orders, COALESCE(SUM(total_amount),0) AS order_value, COALESCE(SUM(paid_amount),0) AS paid_amount FROM craft_orders WHERE sales_channel_id=? AND deleted_at IS NULL`, [channelId]),
        connection.execute(`SELECT id,order_code,external_order_id,order_date,status_code,total_amount FROM craft_orders WHERE sales_channel_id=? AND deleted_at IS NULL ORDER BY order_date DESC LIMIT 20`, [channelId]),
        connection.execute(`SELECT cpm.*,p.name product_name,p.sku product_sku,pv.name variant_name FROM channel_product_mappings cpm JOIN products p ON p.id=cpm.product_id LEFT JOIN product_variants pv ON pv.id=cpm.variant_id WHERE cpm.sales_channel_id=? ORDER BY cpm.id DESC`, [channelId]),
        connection.execute(`SELECT * FROM marketplace_fee_rules WHERE sales_channel_id=? ORDER BY effective_from DESC,id DESC`, [channelId]),
        connection.execute(`SELECT * FROM marketplace_settlements WHERE sales_channel_id=? ORDER BY created_at DESC`, [channelId]),
        connection.execute(`SELECT * FROM integrations WHERE sales_channel_id=? AND integration_type='marketplace' ORDER BY created_at DESC`, [channelId]),
      ]);
      return { channel, summary: summaryRows[0], orders, mappings, fee_rules: fees, settlements, integrations: integrations.map((item: any) => this.integrationView(item)) };
    } finally { connection.release(); }
  }

  async createChannel(data: any, context: { organizationId: number; businessUnitId: number; userId: number }) {
    return this.withTransaction(async (connection) => {
      try {
        const [result]: any = await connection.execute(
          `INSERT INTO sales_channels (business_unit_id,code,name,channel_type,external_url,is_integrated,is_active) VALUES (?,?,?,?,?,0,?)`,
          [context.businessUnitId, data.code, data.name, data.channel_type, data.external_url || null, data.is_active ? 1 : 0],
        );
        const id = Number(result.insertId);
        await this.audit(connection, context, 'marketplace.channel_create', 'sales_channel', id, data.code, `Membuat kanal penjualan ${data.name}.`, data);
        return { id };
      } catch (error) {
        if (isDriverDuplicate(error)) throw new AppError(409, 'SALES_CHANNEL_CODE_EXISTS', 'Kode kanal penjualan sudah digunakan.');
        throw error;
      }
    });
  }

  async updateChannel(id: number, data: any, context: { organizationId: number; businessUnitId: number; userId: number }) {
    return this.withTransaction(async (connection) => {
      const channel = await this.channel(connection, id, context.businessUnitId);
      const next = { name: data.name ?? channel.name, channel_type: data.channel_type ?? channel.channel_type, external_url: data.external_url === undefined ? channel.external_url : data.external_url, is_active: data.is_active === undefined ? Boolean(channel.is_active) : data.is_active };
      await connection.execute('UPDATE sales_channels SET name=?,channel_type=?,external_url=?,is_active=? WHERE id=?', [next.name, next.channel_type, next.external_url || null, next.is_active ? 1 : 0, id]);
      await this.audit(connection, context, next.is_active ? 'marketplace.channel_update' : 'marketplace.channel_deactivate', 'sales_channel', id, channel.code, `Memperbarui kanal penjualan ${channel.name}.`, next);
      return { id };
    });
  }

  async setChannelActive(id: number, active: boolean, context: { organizationId: number; businessUnitId: number; userId: number }) {
    return this.withTransaction(async (connection) => {
      const channel = await this.channel(connection, id, context.businessUnitId);
      const [orders]: any = await connection.execute(`SELECT COUNT(*) AS count FROM craft_orders WHERE sales_channel_id=? AND deleted_at IS NULL AND status_code NOT IN ('completed','cancelled','returned','shipped')`, [id]);
      await connection.execute('UPDATE sales_channels SET is_active=? WHERE id=?', [active ? 1 : 0, id]);
      await this.audit(connection, context, active ? 'marketplace.channel_activate' : 'marketplace.channel_deactivate', 'sales_channel', id, channel.code, `${active ? 'Mengaktifkan' : 'Menonaktifkan'} kanal ${channel.name}.`);
      return { active_order_count: Number(orders[0].count), message: active ? 'Kanal diaktifkan.' : 'Kanal dinonaktifkan. Pesanan historis tidak diubah.' };
    });
  }

  async listMappings(businessUnitId: number, filters: Record<string, unknown>) {
    const where = ['sc.business_unit_id=?']; const params: unknown[] = [businessUnitId];
    if (filters.channel) { where.push('cpm.sales_channel_id=?'); params.push(Number(filters.channel)); }
    if (filters.product) { where.push('cpm.product_id=?'); params.push(Number(filters.product)); }
    if (filters.variant) { where.push('cpm.variant_id=?'); params.push(Number(filters.variant)); }
    if (filters.sync_status) { where.push('cpm.sync_status_code=?'); params.push(String(filters.sync_status)); }
    const [rows]: any = await pool.execute(
      `SELECT cpm.*,sc.name channel_name,sc.code channel_code,p.name product_name,p.sku product_sku,pv.name variant_name,pv.sku variant_sku
       FROM channel_product_mappings cpm JOIN sales_channels sc ON sc.id=cpm.sales_channel_id JOIN products p ON p.id=cpm.product_id LEFT JOIN product_variants pv ON pv.id=cpm.variant_id
       WHERE ${where.join(' AND ')} ORDER BY sc.name,p.name,cpm.id DESC`, params as any[],
    );
    return rows;
  }

  private async assertMappingReferences(connection: Connection, data: any, businessUnitId: number) {
    await this.channel(connection, data.sales_channel_id, businessUnitId);
    const [products]: any = await connection.execute('SELECT id FROM products WHERE id=? AND business_unit_id=? AND is_active=1 AND deleted_at IS NULL', [data.product_id, businessUnitId]);
    if (!products.length) throw new AppError(400, 'INVALID_PRODUCT', 'Produk Craft tidak valid.');
    if (data.variant_id) {
      const [variants]: any = await connection.execute('SELECT id FROM product_variants WHERE id=? AND product_id=? AND is_active=1', [data.variant_id, data.product_id]);
      if (!variants.length) throw new AppError(400, 'INVALID_VARIANT', 'Varian produk tidak cocok dengan produk.');
    }
  }

  async createMapping(data: any, context: { organizationId: number; businessUnitId: number; userId: number }) {
    return this.withTransaction(async (connection) => {
      try {
        await this.assertMappingReferences(connection, data, context.businessUnitId);
        const [result]: any = await connection.execute(
          `INSERT INTO channel_product_mappings (sales_channel_id,product_id,variant_id,external_product_id,external_sku,external_url,sync_status_code,last_synced_at) VALUES (?,?,?,?,?,?,?,?)`,
          [data.sales_channel_id,data.product_id,data.variant_id || null,data.external_product_id || null,data.external_sku,data.external_url || null,data.sync_status_code || 'manual',data.sync_status_code === 'synced' ? dateNow() : null],
        );
        const id=Number(result.insertId); await this.audit(connection,context,'marketplace.product_mapping_create','channel_product_mapping',id,data.external_sku,`Membuat pemetaan SKU ${data.external_sku}.`,data); return {id};
      } catch (error) { if (isDriverDuplicate(error)) throw new AppError(409,'EXTERNAL_SKU_ALREADY_MAPPED','SKU eksternal sudah dipetakan untuk kanal ini.'); throw error; }
    });
  }

  async updateMapping(id: number, data: any, context: { organizationId: number; businessUnitId: number; userId: number }) {
    return this.withTransaction(async (connection) => {
      const [rows]: any = await connection.execute(`SELECT cpm.* FROM channel_product_mappings cpm JOIN sales_channels sc ON sc.id=cpm.sales_channel_id WHERE cpm.id=? AND sc.business_unit_id=? FOR UPDATE`, [id,context.businessUnitId]);
      if (!rows.length) throw new NotFoundError('Pemetaan produk tidak ditemukan.'); const current=rows[0]; const next={...current,...data,sales_channel_id:current.sales_channel_id};
      try { await this.assertMappingReferences(connection,next,context.businessUnitId); await connection.execute(`UPDATE channel_product_mappings SET product_id=?,variant_id=?,external_product_id=?,external_sku=?,external_url=?,sync_status_code=?,last_synced_at=IF(?='synced',UTC_TIMESTAMP(),last_synced_at) WHERE id=?`,[next.product_id,next.variant_id || null,next.external_product_id || null,next.external_sku,next.external_url || null,next.sync_status_code,id]); }
      catch (error) { if (isDriverDuplicate(error)) throw new AppError(409,'EXTERNAL_SKU_ALREADY_MAPPED','SKU eksternal sudah dipetakan untuk kanal ini.'); throw error; }
      await this.audit(connection,context,'marketplace.product_mapping_update','channel_product_mapping',id,next.external_sku,`Memperbarui pemetaan SKU ${next.external_sku}.`,data); return {id};
    });
  }

  async deleteMapping(id: number, context: { organizationId: number; businessUnitId: number; userId: number }) {
    return this.withTransaction(async (connection) => {
      const [rows]: any = await connection.execute(`SELECT cpm.* FROM channel_product_mappings cpm JOIN sales_channels sc ON sc.id=cpm.sales_channel_id WHERE cpm.id=? AND sc.business_unit_id=? FOR UPDATE`, [id,context.businessUnitId]);
      if (!rows.length) throw new NotFoundError('Pemetaan produk tidak ditemukan.'); await connection.execute('DELETE FROM channel_product_mappings WHERE id=?',[id]); await this.audit(connection,context,'marketplace.product_mapping_delete','channel_product_mapping',id,rows[0].external_sku,`Menghapus pemetaan SKU ${rows[0].external_sku}.`); return {id};
    });
  }

  async listFeeRules(businessUnitId: number, channelId?: number) {
    const where=['sc.business_unit_id=?'];const params:unknown[]=[businessUnitId];if(channelId){where.push('mfr.sales_channel_id=?');params.push(channelId);}const [rows]:any=await pool.execute(`SELECT mfr.*,sc.name channel_name,sc.code channel_code FROM marketplace_fee_rules mfr JOIN sales_channels sc ON sc.id=mfr.sales_channel_id WHERE ${where.join(' AND ')} ORDER BY mfr.effective_from DESC,mfr.id DESC`,params as any[]);return rows;
  }

  private async calculateFee(connection: Connection, channelId: number, amount: number, onDate = new Date().toISOString().slice(0, 10)) {
    const [rules]:any=await connection.execute(`SELECT * FROM marketplace_fee_rules WHERE sales_channel_id=? AND is_active=1 AND effective_from<=? AND (effective_until IS NULL OR effective_until>=?) ORDER BY effective_from DESC,id DESC`,[channelId,onDate,onDate]);
    const total=rules.reduce((sum:number,rule:any)=>sum+(Number(rule.percentage_rate||0)/100)*amount+Number(rule.fixed_amount||0),0);return { suggested_fee: Number(total.toFixed(2)), rules };
  }

  async estimateFee(channelId:number,businessUnitId:number,amount:number,onDate?:string){const connection=await pool.getConnection();try{await this.channel(connection,channelId,businessUnitId,{marketplaceOnly:true});return this.calculateFee(connection,channelId,amount,onDate);}finally{connection.release();}}

  async createFeeRule(data:any,context:{organizationId:number;businessUnitId:number;userId:number}){return this.withTransaction(async(connection)=>{await this.channel(connection,data.sales_channel_id,context.businessUnitId,{marketplaceOnly:true});const[result]:any=await connection.execute(`INSERT INTO marketplace_fee_rules (sales_channel_id,name,fee_type,percentage_rate,fixed_amount,applies_to,effective_from,effective_until,is_active) VALUES (?,?,?,?,?,?,?,?,?)`,[data.sales_channel_id,data.name,data.fee_type,data.percentage_rate,data.fixed_amount,data.applies_to,data.effective_from,data.effective_until||null,data.is_active?1:0]);const id=Number(result.insertId);await this.audit(connection,context,'marketplace.fee_rule_create','marketplace_fee_rule',id,null,`Membuat aturan biaya ${data.name}.`,data);return{id};});}

  async updateFeeRule(id:number,data:any,context:{organizationId:number;businessUnitId:number;userId:number}){return this.withTransaction(async(connection)=>{const[rows]:any=await connection.execute(`SELECT mfr.* FROM marketplace_fee_rules mfr JOIN sales_channels sc ON sc.id=mfr.sales_channel_id WHERE mfr.id=? AND sc.business_unit_id=? FOR UPDATE`,[id,context.businessUnitId]);if(!rows.length)throw new NotFoundError('Aturan biaya tidak ditemukan.');const current=rows[0];const next={...current,...data};if(next.effective_until&&next.effective_until<next.effective_from)throw new AppError(400,'VALIDATION_ERROR','Tanggal akhir tidak boleh sebelum tanggal mulai.');await connection.execute(`UPDATE marketplace_fee_rules SET name=?,fee_type=?,percentage_rate=?,fixed_amount=?,applies_to=?,effective_from=?,effective_until=?,is_active=? WHERE id=?`,[next.name,next.fee_type,next.percentage_rate,next.fixed_amount,next.applies_to,next.effective_from,next.effective_until||null,next.is_active?1:0,id]);await this.audit(connection,context,'marketplace.fee_rule_update','marketplace_fee_rule',id,null,`Memperbarui aturan biaya ${next.name}.`,data);return{id};});}

  async deactivateFeeRule(id:number,context:{organizationId:number;businessUnitId:number;userId:number}){return this.withTransaction(async(connection)=>{const[rows]:any=await connection.execute(`SELECT mfr.* FROM marketplace_fee_rules mfr JOIN sales_channels sc ON sc.id=mfr.sales_channel_id WHERE mfr.id=? AND sc.business_unit_id=? FOR UPDATE`,[id,context.businessUnitId]);if(!rows.length)throw new NotFoundError('Aturan biaya tidak ditemukan.');await connection.execute('UPDATE marketplace_fee_rules SET is_active=0 WHERE id=?',[id]);await this.audit(connection,context,'marketplace.fee_rule_deactivate','marketplace_fee_rule',id,null,`Menonaktifkan aturan biaya ${rows[0].name}.`);return{id};});}

  private async cleanupImports() { for (const [token, record] of importPreviews) if (record.expiresAt <= Date.now()) { importPreviews.delete(token); await unlink(record.filePath).catch(() => undefined); } }

  private async parseFile(file: Express.Multer.File): Promise<{ headers: string[]; rows: Array<Record<string, unknown>> }> {
    const extension=path.extname(file.originalname).toLowerCase();
    if (!['.csv','.xlsx'].includes(extension)) throw new AppError(400,'IMPORT_FILE_INVALID','Gunakan file CSV atau XLSX.');
    if (file.size>10*1024*1024) throw new AppError(400,'IMPORT_FILE_INVALID','Ukuran file maksimal 10 MB.');
    let headers:string[]=[];let rows:Array<Record<string,unknown>>=[];
    if(extension==='.csv') { const records=parseCsv(file.buffer,{columns:true,skip_empty_lines:true,bom:true,relax_column_count:true,trim:true}) as Array<Record<string,unknown>>; headers=records.length?Object.keys(records[0]):[]; rows=records; }
    else { const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(file.buffer as any);const sheet=workbook.worksheets[0];if(!sheet)throw new AppError(400,'IMPORT_FILE_INVALID','File XLSX tidak memiliki lembar kerja.');const first=sheet.getRow(1);for(let column=1;column<=first.cellCount;column++)headers.push(String(first.getCell(column).text||'').trim());for(let rowNo=2;rowNo<=sheet.rowCount;rowNo++){const row=sheet.getRow(rowNo);const item:Record<string,unknown>={};let hasValue=false;headers.forEach((header,index)=>{const value=String(row.getCell(index+1).text||'').trim();item[header]=value;if(value)hasValue=true;});if(hasValue)rows.push(item);} }
    if(!headers.length)throw new AppError(400,'IMPORT_FILE_INVALID','Header kolom tidak ditemukan.'); if(rows.length>MAX_IMPORT_ROWS)throw new AppError(400,'IMPORT_FILE_INVALID',`Maksimal ${MAX_IMPORT_ROWS} baris per impor.`); if(!rows.length)throw new AppError(400,'IMPORT_FILE_INVALID','File tidak memiliki baris data.'); return{headers,rows};
  }

  private resolveMapping(headers:string[], supplied?:Record<string,string>): ImportColumnMapping {
    const lookup=new Map(headers.map((header)=>[normalizedHeader(header),header]));const resolved:Record<string,string>={...supplied};for(const[field,aliases]of Object.entries(headerAliases)){if(resolved[field])continue;const found=aliases.map((alias)=>lookup.get(alias)).find(Boolean);if(found)resolved[field]=found;}const required=['external_order_id','order_date','item_name','quantity','unit_price'];const missing=required.filter((field)=>!resolved[field]);if(missing.length)throw new AppError(400,'IMPORT_MAPPING_INVALID',`Pemetaan kolom wajib belum lengkap: ${missing.join(', ')}.`,{headers,missing});return resolved as unknown as ImportColumnMapping;
  }

  private async resolveProductMappings(channelId:number,items:NormalizedImportItem[]){const skus=[...new Set(items.map(item=>item.external_sku).filter(Boolean))] as string[];const productIds=[...new Set(items.map(item=>item.external_product_id).filter(Boolean))] as string[];if(!skus.length&&!productIds.length)return;const clauses:string[]=[];const params:unknown[]=[channelId];if(skus.length){clauses.push(`external_sku IN (${skus.map(()=>'?').join(',')})`);params.push(...skus);}if(productIds.length){clauses.push(`external_product_id IN (${productIds.map(()=>'?').join(',')})`);params.push(...productIds);}const[rows]:any=await pool.execute(`SELECT * FROM channel_product_mappings WHERE sales_channel_id=? AND (${clauses.join(' OR ')})`,params as any[]);for(const item of items){const skuMatch=item.external_sku?rows.find((row:any)=>row.external_sku===item.external_sku):undefined;const idMatches=item.external_product_id?rows.filter((row:any)=>row.external_product_id===item.external_product_id):[];const mapping=skuMatch||(idMatches.length===1?idMatches[0]:undefined);if(mapping){item.product_id=Number(mapping.product_id);item.variant_id=mapping.variant_id?Number(mapping.variant_id):null;item.mapping_status='mapped';}}
  }

  private async resolveCustomer(order:NormalizedImportOrder,businessUnitId:number){const candidates=new Set<number>();if(order.customer_email){const[rows]:any=await pool.execute(`SELECT p.id FROM parties p JOIN party_roles pr ON pr.party_id=p.id AND pr.business_unit_id=? AND pr.role_code='craft_customer' AND pr.is_active=1 WHERE p.email=? AND p.deleted_at IS NULL AND p.status_code='active'`,[businessUnitId,order.customer_email]);rows.forEach((row:any)=>candidates.add(Number(row.id)));}if(order.customer_phone){const[rows]:any=await pool.execute(`SELECT p.id FROM parties p JOIN party_roles pr ON pr.party_id=p.id AND pr.business_unit_id=? AND pr.role_code='craft_customer' AND pr.is_active=1 WHERE p.phone=? AND p.deleted_at IS NULL AND p.status_code='active'`,[businessUnitId,order.customer_phone]);rows.forEach((row:any)=>candidates.add(Number(row.id)));}const ids=[...candidates];if(ids.length===1)return{status:'matched' as const,candidate_ids:ids,party_id:ids[0]};if(ids.length>1)return{status:'ambiguous' as const,candidate_ids:ids};if(order.customer_name&&(order.customer_email||order.customer_phone))return{status:'new' as const,candidate_ids:[]};return{status:'needs_resolution' as const,candidate_ids:[]};}

  async previewImport(file:Express.Multer.File,channelId:number,mappingInput:Record<string,string>|undefined,context:{businessUnitId:number;userId:number}){
    await this.cleanupImports();const connection=await pool.getConnection();try{await this.channel(connection,channelId,context.businessUnitId,{activeOnly:true});}finally{connection.release();}const parsed=await this.parseFile(file);const mapping=this.resolveMapping(parsed.headers,mappingInput);const groups=new Map<string,NormalizedImportOrder>();const allItems:NormalizedImportItem[]=[];parsed.rows.forEach((row,index)=>{const rowNumber=index+2;const externalOrderId=cleanText(pickRowValue(row,mapping.external_order_id));const itemName=cleanText(pickRowValue(row,mapping.item_name));const orderDate=parseImportDate(pickRowValue(row,mapping.order_date));const quantity=parseMoney(pickRowValue(row,mapping.quantity));const unitPrice=parseMoney(pickRowValue(row,mapping.unit_price));const errors:Array<{row_number?:number;message:string}>=[];if(!externalOrderId)errors.push({row_number:rowNumber,message:'External Order ID kosong.'});if(!orderDate)errors.push({row_number:rowNumber,message:'Tanggal pesanan tidak valid.'});if(!itemName)errors.push({row_number:rowNumber,message:'Nama item kosong.'});if(!Number.isInteger(quantity)||quantity<=0)errors.push({row_number:rowNumber,message:'Jumlah tidak valid.'});if(!Number.isFinite(unitPrice)||unitPrice<0)errors.push({row_number:rowNumber,message:'Harga satuan tidak valid.'});const key=externalOrderId||`__invalid_${rowNumber}`;let order=groups.get(key);if(!order){order={external_order_id:externalOrderId||'',order_date:orderDate||'',customer_name:cleanText(pickRowValue(row,mapping.customer_name)),customer_email:cleanText(pickRowValue(row,mapping.customer_email)),customer_phone:cleanText(pickRowValue(row,mapping.customer_phone)),recipient_name:cleanText(pickRowValue(row,mapping.recipient_name)),recipient_phone:cleanText(pickRowValue(row,mapping.recipient_phone)),shipping_address:cleanText(pickRowValue(row,mapping.shipping_address)),courier:cleanText(pickRowValue(row,mapping.courier)),deadline:parseImportDate(pickRowValue(row,mapping.deadline)),order_discount:parseMoney(pickRowValue(row,mapping.order_discount)),shipping_amount:parseMoney(pickRowValue(row,mapping.shipping_amount)),marketplace_fee:parseMoney(pickRowValue(row,mapping.marketplace_fee)),tax:parseMoney(pickRowValue(row,mapping.tax)),external_order_total:mapping.external_order_total?parseMoney(pickRowValue(row,mapping.external_order_total)):null,rows:[],duplicate:false,errors:[],customer:{status:'needs_resolution',candidate_ids:[]}};groups.set(key,order);}order.errors.push(...errors);const item:NormalizedImportItem={row_number:rowNumber,external_product_id:cleanText(pickRowValue(row,mapping.external_product_id)),external_sku:cleanText(pickRowValue(row,mapping.external_sku)),item_name:itemName||'',quantity:Number.isFinite(quantity)?quantity:0,unit_price:Number.isFinite(unitPrice)?unitPrice:0,item_discount:parseMoney(pickRowValue(row,mapping.item_discount)),product_id:null,variant_id:null,mapping_status:'unmapped'};order.rows.push(item);allItems.push(item);});
    await this.resolveProductMappings(channelId,allItems);const orderIds=[...groups.values()].map(order=>order.external_order_id).filter(Boolean);if(orderIds.length){const[duplicates]:any=await pool.execute(`SELECT external_order_id FROM craft_orders WHERE sales_channel_id=? AND external_order_id IN (${orderIds.map(()=>'?').join(',')}) AND deleted_at IS NULL`,[channelId,...orderIds]);const seen=new Set(duplicates.map((row:any)=>row.external_order_id));groups.forEach(order=>{order.duplicate=seen.has(order.external_order_id);});}for(const order of groups.values())order.customer=await this.resolveCustomer(order,context.businessUnitId);const orders=[...groups.values()];const token=randomUUID();await mkdir(IMPORT_ROOT,{recursive:true});const extension=path.extname(file.originalname).toLowerCase();const filePath=path.join(IMPORT_ROOT,`${token}${extension}`);await writeFile(filePath,file.buffer);importPreviews.set(token,{token,userId:context.userId,channelId,filename:path.basename(file.originalname),filePath,expiresAt:Date.now()+IMPORT_EXPIRY_MS,mapping,orders});const summary={orders_detected:orders.length,rows_detected:parsed.rows.length,valid_orders:orders.filter(order=>!order.errors.length&&!order.duplicate).length,duplicate_orders:orders.filter(order=>order.duplicate).length,new_customers:orders.filter(order=>order.customer.status==='new').length,matched_customers:orders.filter(order=>order.customer.status==='matched').length,ambiguous_customers:orders.filter(order=>order.customer.status==='ambiguous').length,mapped_products:allItems.filter(item=>item.mapping_status==='mapped').length,unmapped_products:allItems.filter(item=>item.mapping_status==='unmapped').length,validation_errors:orders.flatMap(order=>order.errors)};return{import_token:token,expires_at:new Date(Date.now()+IMPORT_EXPIRY_MS).toISOString(),headers:parsed.headers,column_mapping:mapping,summary,orders};
  }

  async cancelImport(token:string,userId:number){await this.cleanupImports();const record=importPreviews.get(token);if(!record||record.userId!==userId)throw new AppError(404,'IMPORT_EXPIRED','Preview impor tidak ditemukan atau telah kedaluwarsa.');importPreviews.delete(token);await unlink(record.filePath).catch(()=>undefined);}

  private async genericCustomer(channel:any,context:{organizationId:number;businessUnitId:number;userId:number}){const name=`Pelanggan Marketplace ${channel.name}`;const connection=await pool.getConnection();await connection.beginTransaction();try{const[existing]:any=await connection.execute(`SELECT p.id FROM parties p JOIN party_roles pr ON pr.party_id=p.id AND pr.business_unit_id=? AND pr.role_code='craft_customer' WHERE p.organization_id=? AND p.display_name=? AND p.deleted_at IS NULL LIMIT 1 FOR UPDATE`,[context.businessUnitId,context.organizationId,name]);if(existing.length){await connection.commit();return Number(existing[0].id);}const[result]:any=await connection.execute(`INSERT INTO parties (organization_id,code,party_kind,display_name,status_code,notes) VALUES (?,?,'individual',?,'active','Pelanggan generik untuk impor marketplace terbatas.')`,[context.organizationId,`TMP-${randomUUID()}`,name]);const id=Number(result.insertId);const code=`CUS-${String(id).padStart(6,'0')}`;await connection.execute('UPDATE parties SET code=? WHERE id=?',[code,id]);await connection.execute(`INSERT INTO party_roles (party_id,business_unit_id,role_code,is_active) VALUES (?,?,'craft_customer',1)`,[id,context.businessUnitId]);await connection.commit();return id;}catch(error){await connection.rollback();throw error;}finally{connection.release();}}

  async commitImport(token:string,data:any,context:{organizationId:number;businessUnitId:number;userId:number}){
    await this.cleanupImports();const record=importPreviews.get(token);if(!record||record.userId!==context.userId||record.expiresAt<=Date.now())throw new AppError(410,'IMPORT_EXPIRED','Preview impor telah kedaluwarsa. Silakan unggah ulang file.');const connection=await pool.getConnection();let channel:any;try{channel=await this.channel(connection,record.channelId,context.businessUnitId,{activeOnly:true});}finally{connection.release();}const results:Array<Record<string,unknown>>=[];let success=0,duplicate=0,failed=0,unmapped=0;for(const order of record.orders){if(order.duplicate){duplicate++;results.push({external_order_id:order.external_order_id,status:'duplicate',code:'ORDER_ALREADY_IMPORTED'});continue;}if(order.errors.length){failed++;results.push({external_order_id:order.external_order_id,status:'failed',errors:order.errors});continue;}try{let partyId:number|undefined=order.customer.party_id;const resolution=data.customer_resolutions?.[order.external_order_id];if(resolution?.strategy==='existing'){if(!resolution.party_id)throw new AppError(400,'IMPORT_MAPPING_INVALID',`Pesanan ${order.external_order_id} memerlukan pelanggan yang dipilih.`);partyId=resolution.party_id;}else if(resolution?.strategy==='generic')partyId=await this.genericCustomer(channel,context);else if(resolution?.strategy==='new'||(!partyId&&order.customer.status==='new')){if(!order.customer_name)throw new AppError(400,'IMPORT_MAPPING_INVALID',`Pesanan ${order.external_order_id} memerlukan nama pelanggan.`);const customer=await this.ordersService.quickCreateCustomer({display_name:order.customer_name,party_kind:'individual',email:order.customer_email,phone:order.customer_phone},context.businessUnitId,context.organizationId,context.userId);partyId=Number(customer.id);}if(!partyId)throw new AppError(400,'IMPORT_MAPPING_INVALID',`Pesanan ${order.external_order_id}: pelanggan perlu dipilih.`);const items=order.rows.map(item=>{const resolution=data.product_resolutions?.[String(item.row_number)];const productId=resolution?.product_id??item.product_id;const variantId=resolution?.variant_id??item.variant_id;const asCustom=Boolean(resolution?.as_custom);if(!productId&&!asCustom){unmapped++;throw new AppError(400,'IMPORT_MAPPING_INVALID',`Baris ${item.row_number}: produk belum dipetakan.`);}return{product_id:productId||null,variant_id:variantId||null,item_name:item.item_name,item_description:null,quantity:item.quantity,unit_price:item.unit_price,discount_amount:item.item_discount,custom_spec_json:productId?null:{external_sku:item.external_sku,external_product_id:item.external_product_id,import_source:'manual_marketplace_import'}};});const orderResult=await this.ordersService.createOrder({customer_party_id:partyId,sales_channel_id:record.channelId,external_order_id:order.external_order_id,order_type:'standard',order_date:order.order_date,deadline_at:order.deadline,priority_code:'normal',priority_reason:null,is_priority_manual:false,currency_code:'IDR',discount_amount:order.order_discount,shipping_amount:order.shipping_amount,marketplace_fee_amount:order.marketplace_fee,tax_amount:order.tax,customer_notes:null,internal_notes:`Diimpor dari ${record.filename}. ID eksternal: ${order.external_order_id}`,shipping_recipient_name:order.recipient_name,shipping_phone:order.recipient_phone,shipping_address:order.shipping_address,courier_name:order.courier,items},context.userId,context.businessUnitId,{priceMode:'external_snapshot'});for(const item of order.rows){const resolution=data.product_resolutions?.[String(item.row_number)];if(resolution?.save_mapping&&resolution.product_id&&item.external_sku){try{await this.createMapping({sales_channel_id:record.channelId,product_id:resolution.product_id,variant_id:resolution.variant_id||null,external_product_id:item.external_product_id,external_sku:item.external_sku,external_url:null,sync_status_code:'manual'},context);}catch(error){if(!(error instanceof AppError&&error.code==='EXTERNAL_SKU_ALREADY_MAPPED'))throw error;}}}success++;results.push({external_order_id:order.external_order_id,status:'success',order_id:orderResult.id,order_code:orderResult.order_code});}catch(error){if(isDriverDuplicate(error)||(error instanceof AppError&&error.code==='DUPLICATE_EXTERNAL_ORDER')){duplicate++;results.push({external_order_id:order.external_order_id,status:'duplicate',code:'ORDER_ALREADY_IMPORTED'});}else{failed++;results.push({external_order_id:order.external_order_id,status:'failed',message:error instanceof Error?error.message:'Gagal mengimpor pesanan.'});}}}
    await this.withTransaction(async(connection)=>this.audit(connection,context,'marketplace.import_orders','marketplace_import',null,record.filename,`Impor ${record.filename}: ${success} berhasil, ${duplicate} duplikat, ${failed} gagal.`,{channel_id:record.channelId,processed:record.orders.length,success,duplicate,failed}));importPreviews.delete(token);await unlink(record.filePath).catch(()=>undefined);return{processed:record.orders.length,success,duplicate,failed,warnings:0,unmapped,results};
  }

  private integrationView(row:any){const config=safeJson(row.config_json);const mode=config.mode==='api'?'api':'manual_import';const connectorAvailable=mode==='api'&&marketplaceConnectorRegistry.isAvailable(row.provider_name);return{...row,config_json:config,mode,connector_available:connectorAvailable,api_status:connectorAvailable&&row.status_code==='connected'?'connected':'not_configured',message:connectorAvailable?'':'Connector API belum dikonfigurasi.'};}

  async listIntegrations(businessUnitId:number){const[rows]:any=await pool.execute(`SELECT i.*,sc.name channel_name,sc.code channel_code FROM integrations i LEFT JOIN sales_channels sc ON sc.id=i.sales_channel_id WHERE i.business_unit_id=? AND i.integration_type='marketplace' ORDER BY i.created_at DESC`,[businessUnitId]);return rows.map((row:any)=>this.integrationView(row));}

  async createIntegration(data:any,context:{organizationId:number;businessUnitId:number;userId:number}){return this.withTransaction(async(connection)=>{const channel=await this.channel(connection,data.sales_channel_id,context.businessUnitId);const connector=marketplaceConnectorRegistry.get(data.provider_name);const config={...data.config_json,mode:data.mode};const status=data.mode==='api'&&!connector?'planned':'not_connected';const[result]:any=await connection.execute(`INSERT INTO integrations (organization_id,business_unit_id,sales_channel_id,integration_code,integration_type,provider_name,display_name,status_code,config_json,created_by) VALUES (?,?,?,?, 'marketplace',?,?,?,?,?)`,[context.organizationId,context.businessUnitId,channel.id,`TMP-${randomUUID()}`,data.provider_name,data.display_name,status,JSON.stringify(config),context.userId]);const id=Number(result.insertId);const code=`MKT-${String(id).padStart(6,'0')}`;await connection.execute('UPDATE integrations SET integration_code=? WHERE id=?',[code,id]);await this.refreshChannelIntegrationState(connection,channel.id);await this.audit(connection,context,'marketplace.integration_create','integration',id,code,`Menambahkan konfigurasi integrasi ${data.display_name}.`,{...data,config_json:config});return{id,integration_code:code,status_code:status};});}

  async updateIntegration(id:number,data:any,context:{organizationId:number;businessUnitId:number;userId:number}){return this.withTransaction(async(connection)=>{const[rows]:any=await connection.execute(`SELECT * FROM integrations WHERE id=? AND business_unit_id=? AND integration_type='marketplace' FOR UPDATE`,[id,context.businessUnitId]);if(!rows.length)throw new AppError(404,'MARKETPLACE_INTEGRATION_NOT_FOUND','Integrasi marketplace tidak ditemukan.');const current=rows[0];const existingConfig=safeJson(current.config_json);const mode=data.mode??existingConfig.mode??'manual_import';const provider=data.provider_name??current.provider_name;const config={...(data.config_json??existingConfig),mode};const status=mode==='api'&&!marketplaceConnectorRegistry.isAvailable(provider)?'planned':current.status_code==='connected'?'not_connected':current.status_code;await connection.execute(`UPDATE integrations SET display_name=?,provider_name=?,status_code=?,config_json=? WHERE id=?`,[data.display_name??current.display_name,provider,status,JSON.stringify(config),id]);await this.refreshChannelIntegrationState(connection,current.sales_channel_id);await this.audit(connection,context,'marketplace.integration_update','integration',id,current.integration_code,`Memperbarui konfigurasi integrasi ${current.display_name}.`,{...data,config_json:config});return{id,status_code:status};});}

  async testIntegration(id:number,context:{organizationId:number;businessUnitId:number;userId:number}){const connection=await pool.getConnection();try{const[rows]:any=await connection.execute(`SELECT * FROM integrations WHERE id=? AND business_unit_id=? AND integration_type='marketplace'`,[id,context.businessUnitId]);if(!rows.length)throw new AppError(404,'MARKETPLACE_INTEGRATION_NOT_FOUND','Integrasi marketplace tidak ditemukan.');const integration=rows[0];const connector=marketplaceConnectorRegistry.get(integration.provider_name);if(!connector)throw new AppError(409,'MARKETPLACE_CONNECTOR_NOT_CONFIGURED','Connector API belum dikonfigurasi.');const missing=connector.requiredEnvironmentVariables.filter((name)=>!process.env[name]);if(missing.length)throw new AppError(409,'MARKETPLACE_CREDENTIALS_NOT_CONFIGURED','Kredensial API belum dikonfigurasi.',{required_environment_variables:missing});const result=await connector.testConnection({integrationId:id,config:safeJson(integration.config_json)});await this.withTransaction(async(tx)=>{await tx.execute(`UPDATE integrations SET status_code=? WHERE id=?`,[result.connected?'connected':'error',id]);await this.refreshChannelIntegrationState(tx,integration.sales_channel_id);await this.audit(tx,context,'marketplace.integration_test','integration',id,integration.integration_code,'Menguji koneksi integrasi marketplace.');});return result;}finally{connection.release();}}

  async syncIntegration(id:number,context:{organizationId:number;businessUnitId:number;userId:number}){const connection=await pool.getConnection();try{const[rows]:any=await connection.execute(`SELECT * FROM integrations WHERE id=? AND business_unit_id=? AND integration_type='marketplace'`,[id,context.businessUnitId]);if(!rows.length)throw new AppError(404,'MARKETPLACE_INTEGRATION_NOT_FOUND','Integrasi marketplace tidak ditemukan.');const connector=marketplaceConnectorRegistry.get(rows[0].provider_name);if(!connector)throw new AppError(409,'MARKETPLACE_CONNECTOR_NOT_CONFIGURED','Connector API belum dikonfigurasi.');if(rows[0].status_code!=='connected')throw new AppError(409,'MARKETPLACE_CREDENTIALS_NOT_CONFIGURED','Integrasi API belum terhubung.');throw new AppError(409,'MARKETPLACE_CONNECTOR_NOT_CONFIGURED','Sinkronisasi belum tersedia untuk connector ini.');}finally{connection.release();}}

  async disableIntegration(id:number,context:{organizationId:number;businessUnitId:number;userId:number}){return this.withTransaction(async(connection)=>{const[rows]:any=await connection.execute(`SELECT * FROM integrations WHERE id=? AND business_unit_id=? AND integration_type='marketplace' FOR UPDATE`,[id,context.businessUnitId]);if(!rows.length)throw new AppError(404,'MARKETPLACE_INTEGRATION_NOT_FOUND','Integrasi marketplace tidak ditemukan.');const item=rows[0];await connection.execute(`UPDATE integrations SET status_code='disabled' WHERE id=?`,[id]);await this.refreshChannelIntegrationState(connection,item.sales_channel_id);await this.audit(connection,context,'marketplace.integration_update','integration',id,item.integration_code,`Menonaktifkan integrasi ${item.display_name}.`);return{id};});}

  async getSyncHistory(businessUnitId:number,filters:Record<string,unknown>){const where=['i.business_unit_id=?','i.integration_type=\'marketplace\''];const params:unknown[]=[businessUnitId];if(filters.integration_id){where.push('l.integration_id=?');params.push(Number(filters.integration_id));}if(filters.status){where.push('l.status_code=?');params.push(String(filters.status));}if(filters.sync_type){where.push('l.sync_type=?');params.push(String(filters.sync_type));}const[rows]:any=await pool.execute(`SELECT l.*,i.display_name integration_name,i.provider_name,sc.name channel_name FROM integration_sync_logs l JOIN integrations i ON i.id=l.integration_id LEFT JOIN sales_channels sc ON sc.id=i.sales_channel_id WHERE ${where.join(' AND ')} ORDER BY l.started_at DESC`,params as any[]);return rows;}
  async getSyncLog(id:number,businessUnitId:number){const[rows]:any=await pool.execute(`SELECT l.*,i.display_name integration_name,i.provider_name,sc.name channel_name FROM integration_sync_logs l JOIN integrations i ON i.id=l.integration_id LEFT JOIN sales_channels sc ON sc.id=i.sales_channel_id WHERE l.id=? AND i.business_unit_id=? AND i.integration_type='marketplace'`,[id,businessUnitId]);if(!rows.length)throw new NotFoundError('Riwayat sinkronisasi tidak ditemukan.');return rows[0];}

  private async matchSettlementItems(connection:Connection,settlementId:number,channelId:number){const[items]:any=await connection.execute(`SELECT id,external_order_id FROM marketplace_settlement_items WHERE settlement_id=? AND order_id IS NULL AND external_order_id IS NOT NULL FOR UPDATE`,[settlementId]);let matched=0;for(const item of items){const[orders]:any=await connection.execute(`SELECT id FROM craft_orders WHERE sales_channel_id=? AND external_order_id=? AND deleted_at IS NULL LIMIT 1`,[channelId,item.external_order_id]);if(orders.length){await connection.execute('UPDATE marketplace_settlement_items SET order_id=? WHERE id=?',[orders[0].id,item.id]);matched++;}}return matched;}

  private async assertSettlementMath(settlement:any){const expected=money(settlement.gross_sales)-money(settlement.platform_fees)+money(settlement.vouchers_subsidies)+money(settlement.shipping_adjustments)+money(settlement.other_adjustments);if(Math.abs(expected-money(settlement.net_settlement))>0.01)throw new AppError(409,'SETTLEMENT_NOT_RECONCILABLE','Total settlement tidak sesuai dengan komponen komersialnya.');}

  async listSettlements(businessUnitId:number,filters:Record<string,unknown>){const where=['sc.business_unit_id=?'];const params:unknown[]=[businessUnitId];if(filters.channel){where.push('ms.sales_channel_id=?');params.push(Number(filters.channel));}if(filters.status){where.push('ms.status_code=?');params.push(String(filters.status));}const[rows]:any=await pool.execute(`SELECT ms.*,sc.name channel_name,COUNT(msi.id) item_count,SUM(msi.order_id IS NOT NULL) matched_item_count FROM marketplace_settlements ms JOIN sales_channels sc ON sc.id=ms.sales_channel_id LEFT JOIN marketplace_settlement_items msi ON msi.settlement_id=ms.id WHERE ${where.join(' AND ')} GROUP BY ms.id ORDER BY ms.created_at DESC`,params as any[]);return rows;}

  async createSettlement(data:any,context:{organizationId:number;businessUnitId:number;userId:number}){return this.withTransaction(async(connection)=>{await this.channel(connection,data.sales_channel_id,context.businessUnitId,{marketplaceOnly:true});const provisional=data.settlement_code||`TMP-${randomUUID()}`;try{const[result]:any=await connection.execute(`INSERT INTO marketplace_settlements (sales_channel_id,settlement_code,period_start,period_end,settled_at,gross_sales,platform_fees,vouchers_subsidies,shipping_adjustments,other_adjustments,net_settlement,status_code,external_reference,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,'pending',?,?)`,[data.sales_channel_id,provisional,data.period_start||null,data.period_end||null,data.settled_at||null,data.gross_sales,data.platform_fees,data.vouchers_subsidies,data.shipping_adjustments,data.other_adjustments,data.net_settlement,data.external_reference||null,data.notes||null]);const id=Number(result.insertId);const code=data.settlement_code||`SET-${String(id).padStart(6,'0')}`;if(!data.settlement_code)await connection.execute('UPDATE marketplace_settlements SET settlement_code=? WHERE id=?',[code,id]);for(const item of data.items||[]){await connection.execute(`INSERT INTO marketplace_settlement_items (settlement_id,order_id,external_order_id,gross_amount,fee_amount,adjustment_amount,net_amount) VALUES (?,?,?,?,?,?,?)`,[id,item.order_id||null,item.external_order_id||null,item.gross_amount,item.fee_amount,item.adjustment_amount,item.net_amount]);}await this.matchSettlementItems(connection,id,data.sales_channel_id);await this.audit(connection,context,'marketplace.settlement_create','marketplace_settlement',id,code,`Membuat settlement ${code}.`,data);return{id,settlement_code:code};}catch(error){if(isDriverDuplicate(error))throw new AppError(409,'SETTLEMENT_CODE_EXISTS','Kode settlement sudah digunakan.');throw error;}});}

  async getSettlement(id:number,businessUnitId:number){const[rows]:any=await pool.execute(`SELECT ms.*,sc.name channel_name,ta.name treasury_name,ft.transaction_code FROM marketplace_settlements ms JOIN sales_channels sc ON sc.id=ms.sales_channel_id LEFT JOIN treasury_accounts ta ON ta.id=ms.treasury_account_id LEFT JOIN financial_transactions ft ON ft.id=ms.financial_transaction_id WHERE ms.id=? AND sc.business_unit_id=?`,[id,businessUnitId]);if(!rows.length)throw new AppError(404,'SETTLEMENT_NOT_FOUND','Settlement tidak ditemukan.');const settlement=rows[0];const[items]:any=await pool.execute(`SELECT msi.*,o.order_code,o.total_amount order_total,p.display_name customer_name FROM marketplace_settlement_items msi LEFT JOIN craft_orders o ON o.id=msi.order_id LEFT JOIN parties p ON p.id=o.customer_party_id WHERE msi.settlement_id=? ORDER BY msi.id`,[id]);return{settlement,items,matching:{total:items.length,matched:items.filter((item:any)=>item.order_id).length,unmatched:items.filter((item:any)=>!item.order_id).length}};}

  async updateSettlement(id:number,data:any,context:{organizationId:number;businessUnitId:number;userId:number}){return this.withTransaction(async(connection)=>{const[rows]:any=await connection.execute(`SELECT ms.* FROM marketplace_settlements ms JOIN sales_channels sc ON sc.id=ms.sales_channel_id WHERE ms.id=? AND sc.business_unit_id=? FOR UPDATE`,[id,context.businessUnitId]);if(!rows.length)throw new AppError(404,'SETTLEMENT_NOT_FOUND','Settlement tidak ditemukan.');const current=rows[0];if(current.financial_transaction_id)throw new AppError(409,'SETTLEMENT_ALREADY_POSTED','Settlement yang sudah diposting tidak dapat mengubah nilai komersial.');const next={...current,...data};await this.assertSettlementMath(next);await connection.execute(`UPDATE marketplace_settlements SET settlement_code=?,period_start=?,period_end=?,settled_at=?,gross_sales=?,platform_fees=?,vouchers_subsidies=?,shipping_adjustments=?,other_adjustments=?,net_settlement=?,external_reference=?,notes=? WHERE id=?`,[next.settlement_code,next.period_start||null,next.period_end||null,next.settled_at||null,next.gross_sales,next.platform_fees,next.vouchers_subsidies,next.shipping_adjustments,next.other_adjustments,next.net_settlement,next.external_reference||null,next.notes||null,id]);await this.audit(connection,context,'marketplace.settlement_update','marketplace_settlement',id,current.settlement_code,`Memperbarui settlement ${current.settlement_code}.`,data);return{id};});}

  async matchSettlement(id:number,data:any,context:{organizationId:number;businessUnitId:number;userId:number}){return this.withTransaction(async(connection)=>{const[rows]:any=await connection.execute(`SELECT ms.* FROM marketplace_settlements ms JOIN sales_channels sc ON sc.id=ms.sales_channel_id WHERE ms.id=? AND sc.business_unit_id=? FOR UPDATE`,[id,context.businessUnitId]);if(!rows.length)throw new AppError(404,'SETTLEMENT_NOT_FOUND','Settlement tidak ditemukan.');const settlement=rows[0];if(settlement.financial_transaction_id)throw new AppError(409,'SETTLEMENT_ALREADY_POSTED','Settlement yang sudah diposting tidak dapat diubah pencocokannya.');let autoMatched=await this.matchSettlementItems(connection,id,settlement.sales_channel_id);for(const match of data.matches||[]){const[items]:any=await connection.execute('SELECT id FROM marketplace_settlement_items WHERE id=? AND settlement_id=? FOR UPDATE',[match.item_id,id]);if(!items.length)throw new AppError(400,'INVALID_SETTLEMENT_ITEM','Item settlement tidak valid.');if(match.order_id){const[orders]:any=await connection.execute('SELECT id FROM craft_orders WHERE id=? AND sales_channel_id=? AND deleted_at IS NULL',[match.order_id,settlement.sales_channel_id]);if(!orders.length)throw new AppError(400,'INVALID_SETTLEMENT_ORDER','Pesanan harus berasal dari kanal settlement yang sama.');}await connection.execute('UPDATE marketplace_settlement_items SET order_id=? WHERE id=?',[match.order_id||null,match.item_id]);}await this.audit(connection,context,'marketplace.settlement_update','marketplace_settlement',id,settlement.settlement_code,`Mencocokkan pesanan settlement ${settlement.settlement_code}.`);return{auto_matched:autoMatched};});}

  async receiveSettlement(id:number,data:any,context:{organizationId:number;businessUnitId:number;userId:number}){return this.withTransaction(async(connection)=>{const[rows]:any=await connection.execute(`SELECT ms.* FROM marketplace_settlements ms JOIN sales_channels sc ON sc.id=ms.sales_channel_id WHERE ms.id=? AND sc.business_unit_id=? FOR UPDATE`,[id,context.businessUnitId]);if(!rows.length)throw new AppError(404,'SETTLEMENT_NOT_FOUND','Settlement tidak ditemukan.');const settlement=rows[0];if(settlement.financial_transaction_id)throw new AppError(409,'SETTLEMENT_ALREADY_POSTED','Settlement sudah pernah diposting ke kas.');const[existing]:any=await connection.execute(`SELECT id FROM financial_transactions WHERE source_type='marketplace_settlement' AND source_id=? AND status_code!='void' FOR UPDATE`,[id]);if(existing.length)throw new AppError(409,'SETTLEMENT_ALREADY_POSTED','Settlement sudah memiliki transaksi keuangan.');await this.assertSettlementMath(settlement);const[paidOrders]:any=await connection.execute(`SELECT DISTINCT o.order_code FROM marketplace_settlement_items msi JOIN craft_orders o ON o.id=msi.order_id JOIN invoices i ON i.source_type='craft_order' AND i.source_id=o.id JOIN payments p ON p.invoice_id=i.id AND p.status_code='confirmed' WHERE msi.settlement_id=? LIMIT 20`,[id]);if(paidOrders.length)throw new AppError(409,'MARKETPLACE_SETTLEMENT_DOUBLE_POST_RISK','Ada pesanan settlement yang sudah memiliki pembayaran pelanggan tercatat.',{orders:paidOrders.map((row:any)=>row.order_code)});const posted=await this.financePosting.postMarketplaceSettlement(connection,context,{settlementId:id,settlementCode:settlement.settlement_code,treasuryAccountId:data.treasury_account_id,amount:money(settlement.net_settlement),receivedAt:data.received_at||dateNow()});await connection.execute(`UPDATE marketplace_settlements SET status_code='received',treasury_account_id=?,financial_transaction_id=? WHERE id=?`,[data.treasury_account_id,posted.transactionId,id]);await this.audit(connection,context,'marketplace.settlement_receive','marketplace_settlement',id,settlement.settlement_code,`Menerima payout settlement ${settlement.settlement_code}.`,{financial_transaction_id:posted.transactionId});return{financial_transaction_id:posted.transactionId,transaction_code:posted.transactionCode};});}

  async reconcileSettlement(id:number,context:{organizationId:number;businessUnitId:number;userId:number}){return this.withTransaction(async(connection)=>{const[rows]:any=await connection.execute(`SELECT ms.* FROM marketplace_settlements ms JOIN sales_channels sc ON sc.id=ms.sales_channel_id WHERE ms.id=? AND sc.business_unit_id=? FOR UPDATE`,[id,context.businessUnitId]);if(!rows.length)throw new AppError(404,'SETTLEMENT_NOT_FOUND','Settlement tidak ditemukan.');const settlement=rows[0];await this.assertSettlementMath(settlement);if(!settlement.financial_transaction_id||settlement.status_code==='pending')throw new AppError(409,'SETTLEMENT_NOT_RECONCILABLE','Payout settlement belum diterima.');const[summary]:any=await connection.execute(`SELECT COUNT(*) total,SUM(order_id IS NOT NULL) matched FROM marketplace_settlement_items WHERE settlement_id=?`,[id]);if(!Number(summary[0].total)||Number(summary[0].total)!==Number(summary[0].matched))throw new AppError(409,'SETTLEMENT_NOT_RECONCILABLE','Semua item settlement harus cocok dengan pesanan Craft.');await connection.execute(`UPDATE marketplace_settlements SET status_code='reconciled' WHERE id=?`,[id]);await this.audit(connection,context,'marketplace.settlement_reconcile','marketplace_settlement',id,settlement.settlement_code,`Merekonsiliasi settlement ${settlement.settlement_code}.`);return{id,status_code:'reconciled'};});}
}
