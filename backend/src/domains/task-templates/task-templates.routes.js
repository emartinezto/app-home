import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { listTaskTemplatesController } from './task-templates.controller.js';

export const taskTemplatesRouter = Router();
taskTemplatesRouter.get('/', requireAuth, asyncHandler(listTaskTemplatesController));
