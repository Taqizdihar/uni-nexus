import { Router } from 'express';
import { sendSuccess } from '../shared/utils/response';
import { checkDatabaseConnection } from '../config/database';
import authRoutes from '../modules/auth/auth.routes';
import usersRoutes from '../modules/users/users.routes';
import profileRoutes from '../modules/users/profile.routes';
import { craftOrdersRoutes } from '../modules/craft-orders/craft-orders.routes';
import { craftReferencesRoutes } from '../modules/craft-orders/craft-references.routes';
import { craftProductionRoutes } from '../modules/craft-production/craft-production.routes';

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

export default router;
