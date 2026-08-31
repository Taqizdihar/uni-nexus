import { Router } from 'express';
import { requireAnyPermission, requireAuth, requirePermission } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validation.middleware';
import { TasksController } from './tasks.controller';
import { taskAssigneesSchema, taskCreateSchema, taskIdSchema, taskStatusSchema, tasksListSchema, taskUpdateSchema } from './tasks.schema';

const controller = new TasksController(); export const tasksRoutes = Router();
tasksRoutes.use(requireAuth, requirePermission('tasks.read'));
tasksRoutes.get('/', validateRequest(tasksListSchema), controller.list); tasksRoutes.get('/summary', controller.summary); tasksRoutes.get('/meta', controller.meta);
tasksRoutes.post('/', requirePermission('tasks.write'), validateRequest(taskCreateSchema), controller.create);
tasksRoutes.get('/:id', validateRequest(taskIdSchema), controller.get);
tasksRoutes.patch('/:id', requireAnyPermission('tasks.write', 'tasks.manage'), validateRequest(taskUpdateSchema), controller.update);
tasksRoutes.patch('/:id/status', requirePermission('tasks.write'), validateRequest(taskStatusSchema), controller.status);
tasksRoutes.put('/:id/assignees', requireAnyPermission('tasks.write', 'tasks.manage'), validateRequest(taskAssigneesSchema), controller.assignees);
tasksRoutes.delete('/:id', requireAnyPermission('tasks.write', 'tasks.manage'), validateRequest(taskIdSchema), controller.archive);
