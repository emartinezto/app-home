import { Router } from 'express';
import { requireAuth, requireHousehold } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import {
  weekParamSchema,
  setAvailabilitySchema,
  manualAssignmentSchema,
} from './weeks.validators.js';
import {
  getAvailabilityController,
  setAvailabilityController,
  confirmAvailabilityController,
  getWeekSummaryController,
  generateProposalController,
  confirmProposalController,
  listWeekAssignmentsController,
  createManualAssignmentController,
} from './weeks.controller.js';

export const weeksRouter = Router();
weeksRouter.use(requireAuth, requireHousehold);

weeksRouter.get(
  '/:weekStart/availability',
  validate({ params: weekParamSchema }),
  asyncHandler(getAvailabilityController),
);

weeksRouter.put(
  '/:weekStart/availability/me',
  validate({ params: weekParamSchema, body: setAvailabilitySchema }),
  asyncHandler(setAvailabilityController),
);

weeksRouter.post(
  '/:weekStart/availability/me/confirm',
  validate({ params: weekParamSchema }),
  asyncHandler(confirmAvailabilityController),
);

weeksRouter.get(
  '/:weekStart',
  validate({ params: weekParamSchema }),
  asyncHandler(getWeekSummaryController),
);

weeksRouter.post(
  '/:weekStart/proposal/generate',
  validate({ params: weekParamSchema }),
  asyncHandler(generateProposalController),
);

weeksRouter.post(
  '/:weekStart/proposal/confirm',
  validate({ params: weekParamSchema }),
  asyncHandler(confirmProposalController),
);

weeksRouter.get(
  '/:weekStart/assignments',
  validate({ params: weekParamSchema }),
  asyncHandler(listWeekAssignmentsController),
);

weeksRouter.post(
  '/:weekStart/assignments',
  validate({ params: weekParamSchema, body: manualAssignmentSchema }),
  asyncHandler(createManualAssignmentController),
);
