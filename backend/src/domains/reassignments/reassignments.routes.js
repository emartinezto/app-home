import { Router } from 'express';
import { requireAuth, requireHousehold } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import {
  reassignmentIdParam,
  rejectReassignmentSchema,
  listReassignmentsQuery,
} from './reassignments.validators.js';
import {
  listRequestsController,
  acceptController,
  rejectController,
  cancelController,
} from './reassignments.controller.js';

export const reassignmentsRouter = Router();
reassignmentsRouter.use(requireAuth, requireHousehold);

reassignmentsRouter.get(
  '/',
  validate({ query: listReassignmentsQuery }),
  asyncHandler(listRequestsController),
);

reassignmentsRouter.post(
  '/:id/accept',
  validate({ params: reassignmentIdParam }),
  asyncHandler(acceptController),
);

reassignmentsRouter.post(
  '/:id/reject',
  validate({ params: reassignmentIdParam, body: rejectReassignmentSchema }),
  asyncHandler(rejectController),
);

reassignmentsRouter.post(
  '/:id/cancel',
  validate({ params: reassignmentIdParam }),
  asyncHandler(cancelController),
);
