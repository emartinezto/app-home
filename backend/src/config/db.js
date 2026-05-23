import pg from 'pg';
import { config } from './env.js';
import { logger } from './logger.js';

const { Pool, types } = pg;

// Devuelve los timestamps tal cual vienen, no como objeto Date,
// para que JSON.stringify y comparaciones sean predecibles.
// 1114 = timestamp sin tz; 1184 = timestamptz; 1082 = date.
types.setTypeParser(1114, (v) => v);
types.setTypeParser(1184, (v) => v);
types.setTypeParser(1082, (v) => v);

export const pool = new Pool(
  config.db.connectionString
    ? {
        connectionString: config.db.connectionString,
        max: config.db.connectionLimit,
        ssl: config.db.ssl ? { rejectUnauthorized: false } : undefined,
        keepAlive: true,
      }
    : {
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        database: config.db.database,
        max: config.db.connectionLimit,
        ssl: config.db.ssl ? { rejectUnauthorized: false } : undefined,
        keepAlive: true,
      },
);

pool.on('error', (err) => logger.error({ err }, 'pg pool error'));

// Convierte placeholders MySQL (?) a Postgres ($1, $2, ...) y delega.
// Si el SQL ya usa $n, no se toca.
function adapt(sql) {
  if (sql.indexOf('$1') !== -1) return sql;
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

function shape(result) {
  const cmd = result.command;
  if (cmd === 'SELECT') return result.rows;
  // Mantiene la API previa (mysql2): { insertId, affectedRows } para mutaciones.
  return {
    rows: result.rows,
    affectedRows: result.rowCount ?? 0,
    insertId: result.rows[0]?.id ?? undefined,
  };
}

export async function query(sql, params = []) {
  const result = await pool.query(adapt(sql), params);
  return shape(result);
}

export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const txCtx = {
      query: async (sql, params = []) => {
        const result = await client.query(adapt(sql), params);
        return shape(result);
      },
      raw: client,
    };
    const result = await fn(txCtx);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      logger.error({ err: rollbackErr }, 'Rollback falló');
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function pingDb() {
  await pool.query('SELECT 1');
  return true;
}

export async function closePool() {
  await pool.end();
}
