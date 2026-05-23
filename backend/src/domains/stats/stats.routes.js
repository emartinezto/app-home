import { Router } from 'express';
import { requireAuth, requireHousehold } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { loadQuerySchema } from './stats.validators.js';
import { loadStatsController } from './stats.controller.js';

export const statsRouter = Router();
statsRouter.use(requireAuth, requireHousehold);

statsRouter.get(
  '/load',
  validate({ query: loadQuerySchema }),
  asyncHandler(loadStatsController),
);
