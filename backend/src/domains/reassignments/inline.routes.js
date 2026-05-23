import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import {
  createReassignmentSchema,
  assignmentIdParamForReassign,
} from './reassignments.validators.js';
import { createRequestController } from './reassignments.controller.js';

/**
 * Router montado bajo /assignments/:id/reassignment-requests
 * mergeParams=true para acceder a :id (assignmentId) en el controller.
 */
export const reassignmentRequestRoutes = Router({ mergeParams: true });

reassignmentRequestRoutes.post(
  '/',
  validate({ params: assignmentIdParamForReassign, body: createReassignmentSchema }),
  asyncHandler(createRequestController),
);
