import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { sendSuccess } from '../../shared/utils/response';
import { AppError } from '../../shared/errors/AppError';
import { getCraftBusinessUnit } from '../craft-orders/craft-orders.helpers';
import { CraftMarketplaceService } from './craft-marketplace.service';
import { channelSchema, channelUpdateSchema, feeRuleSchema, feeRuleUpdateSchema, importCommitSchema, integrationSchema, integrationUpdateSchema, productMappingSchema, productMappingUpdateSchema, receiveSettlementSchema, settlementMatchSchema, settlementSchema, settlementUpdateSchema } from './craft-marketplace.schema';

const parseId = (value: string, label = 'ID') => {
  const id = Number.parseInt(value, 10);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'VALIDATION_ERROR', `${label} tidak valid.`);
  return id;
};
const parseJson = <T>(value: unknown, fallback: T): T => {
  if (!value) return fallback;
  if (typeof value === 'object') return value as T;
  try { return JSON.parse(String(value)) as T; } catch { throw new AppError(400, 'IMPORT_MAPPING_INVALID', 'Data JSON impor tidak valid.'); }
};
const contextFor = async (req: Request) => {
  const craft = await getCraftBusinessUnit();
  return { organizationId: craft.organizationId, businessUnitId: craft.id, userId: (req as any).user.id as number };
};
const zodError = (error: unknown) => error instanceof z.ZodError ? new AppError(400, 'VALIDATION_ERROR', 'Data marketplace tidak valid.', error.issues) : error;

export class CraftMarketplaceController {
  private readonly service = new CraftMarketplaceService();

  overview = async (_req: Request, res: Response, next: NextFunction) => { try { const craft = await getCraftBusinessUnit(); sendSuccess(res, await this.service.getOverview(craft.id)); } catch (error) { next(error); } };
  listChannels = async (_req: Request, res: Response, next: NextFunction) => { try { const craft = await getCraftBusinessUnit(); sendSuccess(res, await this.service.listChannels(craft.id)); } catch (error) { next(error); } };
  getChannel = async (req: Request, res: Response, next: NextFunction) => { try { const craft = await getCraftBusinessUnit(); sendSuccess(res, await this.service.getChannelDetail(parseId(String(req.params.id)), craft.id)); } catch (error) { next(error); } };
  createChannel = async (req: Request, res: Response, next: NextFunction) => { try { const data = channelSchema.parse(req.body); sendSuccess(res, await this.service.createChannel(data, await contextFor(req)), undefined, 201); } catch (error) { next(zodError(error)); } };
  updateChannel = async (req: Request, res: Response, next: NextFunction) => { try { const data = channelUpdateSchema.parse(req.body); sendSuccess(res, await this.service.updateChannel(parseId(String(req.params.id)), data, await contextFor(req))); } catch (error) { next(zodError(error)); } };
  activateChannel = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.setChannelActive(parseId(String(req.params.id)), true, await contextFor(req))); } catch (error) { next(error); } };
  deactivateChannel = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.setChannelActive(parseId(String(req.params.id)), false, await contextFor(req))); } catch (error) { next(error); } };

  listMappings = async (req: Request, res: Response, next: NextFunction) => { try { const craft = await getCraftBusinessUnit(); sendSuccess(res, await this.service.listMappings(craft.id, req.query)); } catch (error) { next(error); } };
  createMapping = async (req: Request, res: Response, next: NextFunction) => { try { const data = productMappingSchema.parse(req.body); sendSuccess(res, await this.service.createMapping(data, await contextFor(req)), undefined, 201); } catch (error) { next(zodError(error)); } };
  updateMapping = async (req: Request, res: Response, next: NextFunction) => { try { const data = productMappingUpdateSchema.parse(req.body); sendSuccess(res, await this.service.updateMapping(parseId(String(req.params.id)), data, await contextFor(req))); } catch (error) { next(zodError(error)); } };
  deleteMapping = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.deleteMapping(parseId(String(req.params.id)), await contextFor(req))); } catch (error) { next(error); } };

  listFeeRules = async (req: Request, res: Response, next: NextFunction) => { try { const craft = await getCraftBusinessUnit(); const channel = req.query.channel ? parseId(String(req.query.channel), 'Kanal') : undefined; sendSuccess(res, await this.service.listFeeRules(craft.id, channel)); } catch (error) { next(error); } };
  createFeeRule = async (req: Request, res: Response, next: NextFunction) => { try { const data = feeRuleSchema.parse(req.body); sendSuccess(res, await this.service.createFeeRule(data, await contextFor(req)), undefined, 201); } catch (error) { next(zodError(error)); } };
  updateFeeRule = async (req: Request, res: Response, next: NextFunction) => { try { const data = feeRuleUpdateSchema.parse(req.body); sendSuccess(res, await this.service.updateFeeRule(parseId(String(req.params.id)), data, await contextFor(req))); } catch (error) { next(zodError(error)); } };
  deactivateFeeRule = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.deactivateFeeRule(parseId(String(req.params.id)), await contextFor(req))); } catch (error) { next(error); } };
  estimateFee = async (req: Request, res: Response, next: NextFunction) => { try { const craft = await getCraftBusinessUnit(); const amount = Number(req.query.amount); if (!Number.isFinite(amount) || amount < 0) throw new AppError(400, 'VALIDATION_ERROR', 'Nilai pesanan tidak valid.'); sendSuccess(res, await this.service.estimateFee(parseId(String(req.params.id)), craft.id, amount, req.query.date ? String(req.query.date) : undefined)); } catch (error) { next(error); } };

  previewImport = async (req: Request, res: Response, next: NextFunction) => { try { if (!req.file) throw new AppError(400, 'IMPORT_FILE_INVALID', 'File impor wajib dipilih.'); const context = await contextFor(req); const channelId = parseId(String(req.body.sales_channel_id || ''), 'Kanal'); const mapping = parseJson<Record<string, string>>(req.body.column_mapping, {}); sendSuccess(res, await this.service.previewImport(req.file, channelId, mapping, context), undefined, 201); } catch (error) { next(error); } };
  commitImport = async (req: Request, res: Response, next: NextFunction) => { try { const data = importCommitSchema.parse(req.body); sendSuccess(res, await this.service.commitImport(String(req.params.token), data, await contextFor(req))); } catch (error) { next(zodError(error)); } };
  cancelImport = async (req: Request, res: Response, next: NextFunction) => { try { await this.service.cancelImport(String(req.params.token), (req as any).user.id); sendSuccess(res, { message: 'Preview impor dibatalkan.' }); } catch (error) { next(error); } };
  importTemplate = async (_req: Request, res: Response) => { const header = 'external_order_id,order_date,customer_name,customer_email,customer_phone,recipient_name,recipient_phone,shipping_address,courier,deadline,external_product_id,external_sku,item_name,quantity,unit_price,item_discount,order_discount,shipping_amount,marketplace_fee,tax,external_order_total'; res.setHeader('Content-Type', 'text/csv; charset=utf-8'); res.setHeader('Content-Disposition', 'attachment; filename="uni-nexus-marketplace-import-template.csv"'); res.send(`\uFEFF${header}\n`); };

  listIntegrations = async (_req: Request, res: Response, next: NextFunction) => { try { const craft = await getCraftBusinessUnit(); sendSuccess(res, await this.service.listIntegrations(craft.id)); } catch (error) { next(error); } };
  createIntegration = async (req: Request, res: Response, next: NextFunction) => { try { const data = integrationSchema.parse(req.body); sendSuccess(res, await this.service.createIntegration(data, await contextFor(req)), undefined, 201); } catch (error) { next(zodError(error)); } };
  updateIntegration = async (req: Request, res: Response, next: NextFunction) => { try { const data = integrationUpdateSchema.parse(req.body); sendSuccess(res, await this.service.updateIntegration(parseId(String(req.params.id)), data, await contextFor(req))); } catch (error) { next(zodError(error)); } };
  testIntegration = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.testIntegration(parseId(String(req.params.id)), await contextFor(req))); } catch (error) { next(error); } };
  syncIntegration = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.syncIntegration(parseId(String(req.params.id)), await contextFor(req))); } catch (error) { next(error); } };
  disableIntegration = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.disableIntegration(parseId(String(req.params.id)), await contextFor(req))); } catch (error) { next(error); } };
  listSyncHistory = async (req: Request, res: Response, next: NextFunction) => { try { const craft = await getCraftBusinessUnit(); sendSuccess(res, await this.service.getSyncHistory(craft.id, req.query)); } catch (error) { next(error); } };
  getSyncHistory = async (req: Request, res: Response, next: NextFunction) => { try { const craft = await getCraftBusinessUnit(); sendSuccess(res, await this.service.getSyncLog(parseId(String(req.params.id)), craft.id)); } catch (error) { next(error); } };

  listSettlements = async (req: Request, res: Response, next: NextFunction) => { try { const craft = await getCraftBusinessUnit(); sendSuccess(res, await this.service.listSettlements(craft.id, req.query)); } catch (error) { next(error); } };
  createSettlement = async (req: Request, res: Response, next: NextFunction) => { try { const data = settlementSchema.parse(req.body); sendSuccess(res, await this.service.createSettlement(data, await contextFor(req)), undefined, 201); } catch (error) { next(zodError(error)); } };
  getSettlement = async (req: Request, res: Response, next: NextFunction) => { try { const craft = await getCraftBusinessUnit(); sendSuccess(res, await this.service.getSettlement(parseId(String(req.params.id)), craft.id)); } catch (error) { next(error); } };
  updateSettlement = async (req: Request, res: Response, next: NextFunction) => { try { const data = settlementUpdateSchema.parse(req.body); sendSuccess(res, await this.service.updateSettlement(parseId(String(req.params.id)), data, await contextFor(req))); } catch (error) { next(zodError(error)); } };
  matchSettlement = async (req: Request, res: Response, next: NextFunction) => { try { const data = settlementMatchSchema.parse(req.body); sendSuccess(res, await this.service.matchSettlement(parseId(String(req.params.id)), data, await contextFor(req))); } catch (error) { next(zodError(error)); } };
  receiveSettlement = async (req: Request, res: Response, next: NextFunction) => { try { const data = receiveSettlementSchema.parse(req.body); sendSuccess(res, await this.service.receiveSettlement(parseId(String(req.params.id)), data, await contextFor(req))); } catch (error) { next(zodError(error)); } };
  reconcileSettlement = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.reconcileSettlement(parseId(String(req.params.id)), await contextFor(req))); } catch (error) { next(error); } };
}
