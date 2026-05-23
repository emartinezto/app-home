import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

import { config } from './config/env.js';
import { requestId } from './middlewares/requestId.js';
import { attachLogger } from './middlewares/logger.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';

import { authRouter } from './domains/auth/auth.routes.js';
import { householdsRouter } from './domains/households/households.routes.js';
import { usersRouter } from './domains/users/users.routes.js';
import { taskTemplatesRouter } from './domains/task-templates/task-templates.routes.js';
import { tasksRouter } from './domains/tasks/tasks.routes.js';
import { weeksRouter } from './domains/weeks/weeks.routes.js';
import { assignmentsRouter } from './domains/weeks/assignments.routes.js';
import { reassignmentsRouter } from './domains/reassignments/reassignments.routes.js';
import { statsRouter } from './domains/stats/stats.routes.js';
import { settingsRouter } from './domains/settings/settings.routes.js';

export function buildApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',').map((s) => s.trim()),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id'],
    }),
  );
  app.use(express.json({ limit: '256kb' }));
  app.use(requestId);
  app.use(attachLogger);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', env: config.env, ts: new Date().toISOString() });
  });

  const api = express.Router();
  api.use('/auth', authRouter);
  api.use('/households', householdsRouter);
  api.use('/users', usersRouter);
  api.use('/task-templates', taskTemplatesRouter);
  api.use('/tasks', tasksRouter);
  api.use('/weeks', weeksRouter);
  api.use('/assignments', assignmentsRouter);
  api.use('/reassignment-requests', reassignmentsRouter);
  api.use('/stats', statsRouter);
  api.use('/settings', settingsRouter);

  app.use('/api/v1', api);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
