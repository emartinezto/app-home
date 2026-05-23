import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import {
  updateProfileSchema,
  workScheduleSchema,
  pushSubscriptionSchema,
  subscriptionIdParam,
} from './users.validators.js';
import {
  getMeController,
  patchMeController,
  setWorkScheduleController,
  addPushSubscriptionController,
  listPushSubscriptionsController,
  removePushSubscriptionController,
  deleteMeController,
} from './users.controller.js';

export const usersRouter = Router();

usersRouter.get('/me', requireAuth, asyncHandler(getMeController));

usersRouter.patch(
  '/me',
  requireAuth,
  validate({ body: updateProfileSchema }),
  asyncHandler(patchMeController),
);

usersRouter.put(
  '/me/work-schedule',
  requireAuth,
  validate({ body: workScheduleSchema }),
  asyncHandler(setWorkScheduleController),
);

usersRouter.get('/me/push-subscriptions', requireAuth, asyncHandler(listPushSubscriptionsController));

usersRouter.post(
  '/me/push-subscriptions',
  requireAuth,
  validate({ body: pushSubscriptionSchema }),
  asyncHandler(addPushSubscriptionController),
);

usersRouter.delete(
  '/me/push-subscriptions/:id',
  requireAuth,
  validate({ params: subscriptionIdParam }),
  asyncHandler(removePushSubscriptionController),
);

usersRouter.delete('/me', requireAuth, asyncHandler(deleteMeController));
