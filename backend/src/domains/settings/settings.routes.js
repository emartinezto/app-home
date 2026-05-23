import { Router } from 'express';
import { requireAuth, requireHousehold } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { updateSettingsSchema } from './settings.validators.js';
import {
  getSettingsController,
  patchSettingsController,
} from './settings.controller.js';

export const settingsRouter = Router();
settingsRouter.use(requireAuth, requireHousehold);

settingsRouter.get('/', asyncHandler(getSettingsController));
settingsRouter.patch(
  '/',
  validate({ body: updateSettingsSchema }),
  asyncHandler(patchSettingsController),
);
