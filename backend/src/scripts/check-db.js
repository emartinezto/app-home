import { query, closePool, pingDb } from '../config/db.js';
import { logger } from '../config/logger.js';
import { config } from '../config/env.js';

const REQUIRED_TABLES = [
  'households',
  'users',
  'task_templates',
  'tasks',
  'weekly_availability',
  'weekly_proposals',
  'weekly_assignments',
  'reassignment_requests',
  'refresh_tokens',
  'push_subscriptions',
];

async function main() {
  try {
    await pingDb();
    logger.info(
      { host: config.db.host ?? '(DATABASE_URL)', port: config.db.port, db: config.db.database },
      '✅ Conexión Postgres OK',
    );

    const rows = await query(
      `SELECT table_name AS name FROM information_schema.tables WHERE table_schema = 'public'`,
    );
    const present = new Set(rows.map((r) => r.name));

    const missing = REQUIRED_TABLES.filter((t) => !present.has(t));
    if (missing.length > 0) {
      logger.error({ missing }, '❌ Faltan tablas requeridas');
      process.exitCode = 1;
    } else {
      logger.info({ tables: REQUIRED_TABLES.length }, '✅ Todas las tablas presentes');
    }

    const counts = {};
    for (const t of REQUIRED_TABLES.filter((x) => present.has(x))) {
      const r = await query(`SELECT COUNT(*) AS n FROM "${t}"`);
      counts[t] = Number(r[0].n);
    }
    logger.info({ counts }, 'Filas por tabla');
  } catch (err) {
    logger.error({ err: { message: err.message, code: err.code } }, '❌ check-db falló');
    process.exitCode = 1;
  } finally {
    await closePool().catch(() => {});
    setTimeout(() => process.exit(process.exitCode ?? 0), 100).unref();
  }
}

main();
