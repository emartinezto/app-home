import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { config } from '../../config/env.js';
import { validate } from '../../middlewares/validate.js';
import { requireAuth } from '../../middlewares/auth.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import {
  signupSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
} from './auth.validators.js';
import {
  signupController,
  loginController,
  refreshController,
  logoutController,
  logoutAllController,
} from './auth.controller.js';

const loginLimiter = rateLimit({
  windowMs: config.rateLimit.loginWindowMs,
  max: config.rateLimit.loginMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_ATTEMPTS', details: 'Demasiados intentos, prueba en unos minutos' },
});

export const authRouter = Router();

authRouter.post('/signup', validate({ body: signupSchema }), asyncHandler(signupController));
authRouter.post(
  '/login',
  loginLimiter,
  validate({ body: loginSchema }),
  asyncHandler(loginController),
);
authRouter.post('/refresh', validate({ body: refreshSchema }), asyncHandler(refreshController));
authRouter.post(
  '/logout',
  requireAuth,
  validate({ body: logoutSchema }),
  asyncHandler(logoutController),
);
authRouter.post('/logout-all', requireAuth, asyncHandler(logoutAllController));
