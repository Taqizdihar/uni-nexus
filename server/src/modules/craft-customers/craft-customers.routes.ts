import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.middleware';
import { CraftCustomersController } from './craft-customers.controller';

const controller = new CraftCustomersController();
export const craftCustomersRoutes = Router();

craftCustomersRoutes.use(requireAuth);

craftCustomersRoutes.get('/', requirePermission('craft.customers.read'), controller.list);
craftCustomersRoutes.get('/summary', requirePermission('craft.customers.read'), controller.summary);
craftCustomersRoutes.get('/partners', requirePermission('craft.customers.read'), controller.partners);
craftCustomersRoutes.get('/export', requirePermission('craft.customers.read'), controller.exportCsv);
craftCustomersRoutes.post('/duplicates', requirePermission('craft.customers.read'), controller.duplicates);
craftCustomersRoutes.post('/', requirePermission('craft.customers.write'), controller.create);

craftCustomersRoutes.get('/:id', requirePermission('craft.customers.read'), controller.get);
craftCustomersRoutes.patch('/:id', requirePermission('craft.customers.write'), controller.update);
craftCustomersRoutes.patch('/:id/status', requirePermission('craft.customers.write'), controller.setStatus);
craftCustomersRoutes.get('/:id/orders', requirePermission('craft.customers.read'), controller.getOrders);
craftCustomersRoutes.get('/:id/commercial-summary', requirePermission('craft.customers.read'), controller.getCommercial);
craftCustomersRoutes.get('/:id/resolve-price', requirePermission('craft.customers.read'), controller.resolvePrice);

craftCustomersRoutes.post('/:id/contacts', requirePermission('craft.customers.write'), controller.createContact);
craftCustomersRoutes.patch('/:id/contacts/:contactId', requirePermission('craft.customers.write'), controller.updateContact);
craftCustomersRoutes.delete('/:id/contacts/:contactId', requirePermission('craft.customers.write'), controller.deleteContact);

craftCustomersRoutes.post('/:id/partner', requirePermission('craft.customers.write'), controller.promotePartner);
craftCustomersRoutes.patch('/:id/partner', requirePermission('craft.customers.write'), controller.updatePartner);
craftCustomersRoutes.delete('/:id/partner', requirePermission('craft.customers.write'), controller.endPartner);

craftCustomersRoutes.get('/:id/price-rules', requirePermission('craft.customers.read'), controller.getPrices);
craftCustomersRoutes.post('/:id/price-rules', requirePermission('craft.customers.write'), controller.createPrice);
craftCustomersRoutes.patch('/:id/price-rules/:ruleId', requirePermission('craft.customers.write'), controller.updatePrice);
craftCustomersRoutes.delete('/:id/price-rules/:ruleId', requirePermission('craft.customers.write'), controller.deactivatePrice);
