import { Router } from 'express';
import { requireAuth, requireHousehold } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { assignmentIdParam } from './weeks.validators.js';
import {
  markDoneController,
  markUndoneController,
} from './assignments.controller.js';
import { reassignmentRequestRoutes } from '../reassignments/inline.routes.js';

export const assignmentsRouter = Router();
assignmentsRouter.use(requireAuth, requireHousehold);

assignmentsRouter.patch(
  '/:id/done',
  validate({ params: assignmentIdParam }),
  asyncHandler(markDoneController),
);

assignmentsRouter.patch(
  '/:id/undone',
  validate({ params: assignmentIdParam }),
  asyncHandler(markUndoneController),
);

// POST /assignments/:id/reassignment-requests vive aquí (router anidado)
assignmentsRouter.use('/:id/reassignment-requests', reassignmentRequestRoutes);
