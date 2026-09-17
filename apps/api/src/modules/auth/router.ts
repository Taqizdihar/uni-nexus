import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { requireAuth } from '../../middleware/auth.js';
import { authConfig, changePassword, currentUser, login, signup } from './service.js';
import { changePasswordSchema, loginSchema, signupSchema } from './validation.js';
import { clearSession, issueSession } from './session.js';

export const authRouter = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many authentication attempts. Please try again later.',
    },
  },
});
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many registration attempts. Please try again later.',
    },
  },
});

authRouter.get('/auth/config', async (_request, response) => {
  response.json({ data: await authConfig() });
});
authRouter.post('/auth/signup', registrationLimiter, async (request, response) => {
  const { user, bootstrapped } = await signup(signupSchema.parse(request.body));
  if (!bootstrapped) {
    response.status(201).json({
      data: {
        status: 'PENDING',
        message: 'Your UNI-NEXUS account has been submitted and is awaiting approval.',
      },
    });
    return;
  }
  issueSession(response, user);
  response.status(201).json({ data: await currentUser(user.id) });
});
authRouter.post('/auth/login', authLimiter, async (request, response) => {
  const input = loginSchema.parse(request.body);
  const user = await login(input.email, input.password);
  issueSession(response, user);
  response.json({ data: await currentUser(user.id) });
});
authRouter.post('/auth/logout', (_request, response) => {
  clearSession(response);
  response.json({ data: { loggedOut: true } });
});
authRouter.get('/auth/me', requireAuth, async (request, response) => {
  response.json({ data: await currentUser(request.auth!.userId) });
});
authRouter.post('/auth/password', authLimiter, requireAuth, async (request, response) => {
  const input = changePasswordSchema.parse(request.body);
  const user = await changePassword(
    request.auth!.userId,
    input.current_password,
    input.new_password,
  );
  issueSession(response, user);
  response.json({ data: { changed: true } });
});
