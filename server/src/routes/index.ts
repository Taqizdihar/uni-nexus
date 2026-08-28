import { Router } from 'express';
import { sendSuccess } from '../shared/utils/response';
import { checkDatabaseConnection } from '../config/database';
import authRoutes from '../modules/auth/auth.routes';
import usersRoutes from '../modules/users/users.routes';
import profileRoutes from '../modules/users/profile.routes';
import { craftOrdersRoutes } from '../modules/craft-orders/craft-orders.routes';
import { craftReferencesRoutes } from '../modules/craft-orders/craft-references.routes';
import { craftProductionRoutes } from '../modules/craft-production/craft-production.routes';
import { craftProductsRoutes } from '../modules/craft-products/craft-products.routes';
import { craftPrintersRoutes } from '../modules/craft-printers/craft-printers.routes';
import { craftMaterialsRoutes } from '../modules/craft-materials/craft-materials.routes';
import { craftCustomersRoutes } from '../modules/craft-customers/craft-customers.routes';
import { craftProcurementRoutes } from '../modules/craft-procurement/craft-procurement.routes';
import { craftFinanceRoutes } from '../modules/craft-finance/craft-finance.routes';
import { craftAnalyticsRoutes } from '../modules/craft-analytics/craft-analytics.routes';
import { craftMarketplaceRoutes } from '../modules/craft-marketplace/craft-marketplace.routes';
import { craftAutomationsRoutes } from '../modules/craft-automations/craft-automations.routes';
import { studioProjectsRoutes } from '../modules/studio-projects/studio-projects.routes';
import { studioReferencesRoutes } from '../modules/studio-references/studio-references.routes';
import { studioClientsRoutes } from '../modules/studio-clients/studio-clients.routes';
import { studioServicesRoutes } from '../modules/studio-services/studio-services.routes';
import { studioEquipmentRoutes } from '../modules/studio-equipment/studio-equipment.routes';
import { studioBillingRoutes } from '../modules/studio-billing/studio-billing.routes';
import { studioVendorsRoutes } from '../modules/studio-vendors/studio-vendors.routes';
import { studioFinanceRoutes } from '../modules/studio-finance/studio-finance.routes';
import { studioAnalyticsRoutes } from '../modules/studio-analytics/studio-analytics.routes';
import { studioAutomationsRoutes } from '../modules/studio-automations/studio-automations.routes';

const router = Router();

router.get('/health', async (req, res) => {
  const isDbConnected = await checkDatabaseConnection();
  
  sendSuccess(res, {
    status: 'ok',
    database: isDbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/profile', profileRoutes);

router.use('/craft/orders', craftOrdersRoutes);
router.use('/craft/references', craftReferencesRoutes);
router.use('/craft/production', craftProductionRoutes);
router.use('/craft/products', craftProductsRoutes);
router.use('/craft/printers', craftPrintersRoutes);
router.use('/craft/materials', craftMaterialsRoutes);
router.use('/craft/customers', craftCustomersRoutes);
router.use('/craft/procurement', craftProcurementRoutes);
router.use('/craft/finance', craftFinanceRoutes);
router.use('/craft/analytics', craftAnalyticsRoutes);
router.use('/craft/marketplace', craftMarketplaceRoutes);
router.use('/craft/automations', craftAutomationsRoutes);

router.use('/studio/projects', studioProjectsRoutes);
router.use('/studio/references', studioReferencesRoutes);
router.use('/studio/clients', studioClientsRoutes);
router.use('/studio/services', studioServicesRoutes);
router.use('/studio/equipment', studioEquipmentRoutes);
router.use('/studio/billing', studioBillingRoutes);
router.use('/studio/vendors', studioVendorsRoutes);
router.use('/studio/finance', studioFinanceRoutes);
router.use('/studio/analytics', studioAnalyticsRoutes);
router.use('/studio/automations', studioAutomationsRoutes);

export default router;
