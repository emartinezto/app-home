import http from 'node:http';
import { buildApp } from './app.js';
import { config } from './config/env.js';
import { logger } from './config/logger.js';
import { pingDb, closePool } from './config/db.js';
import { initSockets } from './sockets/index.js';
import { startCronJobs, stopCronJobs } from './cron/index.js';
import { initPushService } from './services/push.service.js';

async function main() {
  try {
    await pingDb();
    logger.info('✅ Postgres conectado');
  } catch (err) {
    logger.fatal({ err }, '❌ No se pudo conectar a Postgres');
    process.exit(1);
  }

  initPushService();

  const app = buildApp();
  const server = http.createServer(app);

  initSockets(server);

  if (config.cron.enabled) {
    startCronJobs();
    logger.info({ tz: config.cron.timezone }, '⏰ Cron jobs iniciados');
  } else {
    logger.warn('⏰ Cron jobs DESACTIVADOS (CRON_ENABLED=false)');
  }

  server.listen(config.port, () => {
    logger.info(`🚀 Casa García API escuchando en http://localhost:${config.port}`);
  });

  const shutdown = async (signal) => {
    logger.info(`Recibido ${signal}, cerrando…`);
    stopCronJobs();
    server.close(() => logger.info('HTTP server cerrado'));
    try {
      await closePool();
      logger.info('Pool Postgres cerrado');
    } catch (err) {
      logger.error({ err }, 'Error cerrando pool');
    }
    setTimeout(() => process.exit(0), 500).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (err) => logger.error({ err }, 'unhandledRejection'));
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'uncaughtException');
    process.exit(1);
  });
}

main();
