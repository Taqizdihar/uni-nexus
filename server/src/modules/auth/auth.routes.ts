import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validateRequest } from '../../middleware/validation.middleware';
import { registerSchema, loginSchema, logoutSchema } from './auth.schema';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

router.post('/register', validateRequest(registerSchema), AuthController.register);
router.post('/login', validateRequest(loginSchema), AuthController.login);
router.post('/logout', requireAuth, validateRequest(logoutSchema), AuthController.logout);
router.get('/me', requireAuth, AuthController.me);

export default router;
