import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.middleware';
import { StudioClientsController } from './studio-clients.controller';

const router = Router();
const controller = new StudioClientsController();

const READ = requirePermission('studio.clients.read');
const WRITE = requirePermission('studio.clients.write');

router.use(requireAuth);

// Static routes must stay ahead of /:id so they are never captured as a client ID.
router.get('/summary', READ, controller.getSummary);
router.get('/export', READ, controller.exportClients);
router.post('/duplicates', READ, controller.findDuplicates);

router.get('/', READ, controller.getClients);
router.post('/', WRITE, controller.createClient);

router.get('/:id', READ, controller.getClient);
router.patch('/:id', WRITE, controller.updateClient);
router.post('/:id/activate', WRITE, controller.activateClient);
router.post('/:id/deactivate', WRITE, controller.deactivateClient);

router.get('/:id/contacts', READ, controller.getContacts);
router.post('/:id/contacts', WRITE, controller.createContact);
router.patch('/:id/contacts/:contactId', WRITE, controller.updateContact);
router.delete('/:id/contacts/:contactId', WRITE, controller.deleteContact);

router.get('/:id/projects', READ, controller.getProjects);
router.get('/:id/commercial-summary', READ, controller.getCommercialSummary);
router.get('/:id/quotations', READ, controller.getQuotations);
router.get('/:id/invoices', READ, controller.getInvoices);
router.get('/:id/activity', READ, controller.getActivity);

export const studioClientsRoutes = router;
