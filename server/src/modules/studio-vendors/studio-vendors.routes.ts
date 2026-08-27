import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.middleware';
import { StudioVendorsController } from './studio-vendors.controller';

const router = Router(); const controller = new StudioVendorsController();
const read = requirePermission('studio.vendors.read'); const write = requirePermission('studio.vendors.write');
router.use(requireAuth);
router.get('/summary', read, controller.summary); router.get('/export', read, controller.export); router.post('/duplicates', read, controller.duplicates); router.get('/projects', read, controller.projects);
router.get('/', read, controller.list); router.post('/', write, controller.create);
router.get('/:id', read, controller.detail); router.patch('/:id', write, controller.update);
router.post('/:id/roles/:role/activate', write, controller.activateRole); router.post('/:id/roles/:role/deactivate', write, controller.deactivateRole);
router.get('/:id/contacts', read, controller.contacts); router.post('/:id/contacts', write, controller.createContact); router.patch('/:id/contacts/:contactId', write, controller.updateContact); router.delete('/:id/contacts/:contactId', write, controller.deleteContact);
router.get('/:id/assignments', read, controller.assignments); router.post('/:id/assignments', write, controller.addAssignment); router.patch('/:id/assignments/:assignmentId', write, controller.updateAssignment); router.post('/:id/assignments/:assignmentId/end', write, controller.endAssignment);
router.get('/:id/commercial-summary', read, controller.commercial); router.get('/:id/expenses', read, controller.expenses); router.get('/:id/maintenance', read, controller.maintenance); router.get('/:id/activity', read, controller.activity);
export const studioVendorsRoutes = router;
