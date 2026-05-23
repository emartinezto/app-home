import { Router } from 'express';
import { requireAuth, requireHousehold } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import {
  createTaskSchema,
  updateTaskSchema,
  taskIdParam,
  bulkActivateSchema,
  tasksQuerySchema,
} from './tasks.validators.js';
import {
  listTasksController,
  createTaskController,
  patchTaskController,
  deleteTaskController,
  bulkActivateController,
} from './tasks.controller.js';

export const tasksRouter = Router();

tasksRouter.use(requireAuth, requireHousehold);

tasksRouter.get('/', validate({ query: tasksQuerySchema }), asyncHandler(listTasksController));

tasksRouter.post(
  '/',
  validate({ body: createTaskSchema }),
  asyncHandler(createTaskController),
);

tasksRouter.post(
  '/bulk-activate',
  validate({ body: bulkActivateSchema }),
  asyncHandler(bulkActivateController),
);

tasksRouter.patch(
  '/:id',
  validate({ params: taskIdParam, body: updateTaskSchema }),
  asyncHandler(patchTaskController),
);

tasksRouter.delete(
  '/:id',
  validate({ params: taskIdParam }),
  asyncHandler(deleteTaskController),
);
