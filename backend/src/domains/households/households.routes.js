import { Router } from 'express';
import { requireAuth, requireHousehold } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { createHouseholdSchema, joinHouseholdSchema } from './households.validators.js';
import {
  createHouseholdController,
  joinHouseholdController,
  getMyHouseholdController,
  regenerateInviteCodeController,
} from './households.controller.js';

export const householdsRouter = Router();

householdsRouter.post(
  '/',
  requireAuth,
  validate({ body: createHouseholdSchema }),
  asyncHandler(createHouseholdController),
);

householdsRouter.post(
  '/join',
  requireAuth,
  validate({ body: joinHouseholdSchema }),
  asyncHandler(joinHouseholdController),
);

householdsRouter.get(
  '/me',
  requireAuth,
  requireHousehold,
  asyncHandler(getMyHouseholdController),
);

householdsRouter.post(
  '/me/invite-code/regenerate',
  requireAuth,
  requireHousehold,
  asyncHandler(regenerateInviteCodeController),
);
