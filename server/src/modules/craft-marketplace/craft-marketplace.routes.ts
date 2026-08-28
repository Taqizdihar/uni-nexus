import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.middleware';
import { createUpload } from '../../shared/storage';
import { CraftMarketplaceController } from './craft-marketplace.controller';

const router = Router();
const controller = new CraftMarketplaceController();
const importUpload = createUpload('marketplace_import');

router.use(requireAuth);
router.get('/overview', requirePermission('craft.marketplace.read'), controller.overview);
router.get('/channels', requirePermission('craft.marketplace.read'), controller.listChannels);
router.get('/channels/:id/fee-estimate', requirePermission('craft.marketplace.read'), controller.estimateFee);
router.post('/channels', requirePermission('craft.marketplace.write'), controller.createChannel);
router.patch('/channels/:id', requirePermission('craft.marketplace.write'), controller.updateChannel);
router.post('/channels/:id/activate', requirePermission('craft.marketplace.write'), controller.activateChannel);
router.post('/channels/:id/deactivate', requirePermission('craft.marketplace.write'), controller.deactivateChannel);
router.get('/channels/:id', requirePermission('craft.marketplace.read'), controller.getChannel);

router.get('/product-mappings', requirePermission('craft.marketplace.read'), controller.listMappings);
router.post('/product-mappings', requirePermission('craft.marketplace.write'), controller.createMapping);
router.patch('/product-mappings/:id', requirePermission('craft.marketplace.write'), controller.updateMapping);
router.delete('/product-mappings/:id', requirePermission('craft.marketplace.write'), controller.deleteMapping);

router.get('/fee-rules', requirePermission('craft.marketplace.read'), controller.listFeeRules);
router.post('/fee-rules', requirePermission('craft.marketplace.write'), controller.createFeeRule);
router.patch('/fee-rules/:id', requirePermission('craft.marketplace.write'), controller.updateFeeRule);
router.post('/fee-rules/:id/deactivate', requirePermission('craft.marketplace.write'), controller.deactivateFeeRule);

router.get('/imports/template.csv', requirePermission('craft.marketplace.read'), controller.importTemplate);
router.post('/imports/preview', requirePermission('craft.marketplace.sync'), importUpload.single('file'), controller.previewImport);
router.post('/imports/:token/commit', requirePermission('craft.marketplace.sync'), controller.commitImport);
router.delete('/imports/:token', requirePermission('craft.marketplace.sync'), controller.cancelImport);

router.get('/integrations', requirePermission('craft.marketplace.read'), controller.listIntegrations);
router.post('/integrations', requirePermission('craft.marketplace.write'), controller.createIntegration);
router.patch('/integrations/:id', requirePermission('craft.marketplace.write'), controller.updateIntegration);
router.post('/integrations/:id/test', requirePermission('craft.marketplace.sync'), controller.testIntegration);
router.post('/integrations/:id/sync', requirePermission('craft.marketplace.sync'), controller.syncIntegration);
router.post('/integrations/:id/disable', requirePermission('craft.marketplace.write'), controller.disableIntegration);

router.get('/sync-history', requirePermission('craft.marketplace.read'), controller.listSyncHistory);
router.get('/sync-history/:id', requirePermission('craft.marketplace.read'), controller.getSyncHistory);

router.get('/settlements', requirePermission('craft.marketplace.read'), controller.listSettlements);
router.post('/settlements', requirePermission('craft.marketplace.write'), controller.createSettlement);
router.get('/settlements/:id', requirePermission('craft.marketplace.read'), controller.getSettlement);
router.patch('/settlements/:id', requirePermission('craft.marketplace.write'), controller.updateSettlement);
router.post('/settlements/:id/match', requirePermission('craft.marketplace.write'), controller.matchSettlement);
router.post('/settlements/:id/receive', requirePermission('craft.marketplace.write'), controller.receiveSettlement);
router.post('/settlements/:id/reconcile', requirePermission('craft.marketplace.write'), controller.reconcileSettlement);

export const craftMarketplaceRoutes = router;
