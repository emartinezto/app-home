import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  CORS_ORIGIN: z.string().default('*'),

  DATABASE_URL: z.string().optional(),
  DB_HOST: z.string().optional(),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_NAME: z.string().optional(),
  DB_CONNECTION_LIMIT: z.coerce.number().int().positive().default(10),
  DB_SSL: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET debe tener al menos 32 caracteres'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET debe tener al menos 32 caracteres'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),

  BCRYPT_COST: z.coerce.number().int().min(10).max(15).default(12),

  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(5 * 60 * 1000),

  VAPID_PUBLIC_KEY: z.string().default(''),
  VAPID_PRIVATE_KEY: z.string().default(''),
  VAPID_SUBJECT: z.string().default('mailto:admin@casa-garcia.local'),

  CRON_TIMEZONE: z.string().default('Europe/Madrid'),
  CRON_ENABLED: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),

  DEFAULT_TIMEZONE: z.string().default('Europe/Madrid'),
  INVITE_CODE_TTL_HOURS: z.coerce.number().int().positive().default(48),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Configuración de entorno inválida:');
  // eslint-disable-next-line no-console
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = Object.freeze({
  env: parsed.data.NODE_ENV,
  isProd: parsed.data.NODE_ENV === 'production',
  isDev: parsed.data.NODE_ENV === 'development',
  port: parsed.data.PORT,
  logLevel: parsed.data.LOG_LEVEL,
  corsOrigin: parsed.data.CORS_ORIGIN,

  db: {
    connectionString: parsed.data.DATABASE_URL,
    host: parsed.data.DB_HOST,
    port: parsed.data.DB_PORT,
    user: parsed.data.DB_USER,
    password: parsed.data.DB_PASSWORD,
    database: parsed.data.DB_NAME,
    connectionLimit: parsed.data.DB_CONNECTION_LIMIT,
    ssl: parsed.data.DB_SSL,
  },

  jwt: {
    accessSecret: parsed.data.JWT_ACCESS_SECRET,
    refreshSecret: parsed.data.JWT_REFRESH_SECRET,
    accessTtl: parsed.data.JWT_ACCESS_TTL,
    refreshTtlDays: parsed.data.JWT_REFRESH_TTL_DAYS,
  },

  bcrypt: {
    cost: parsed.data.BCRYPT_COST,
  },

  rateLimit: {
    loginMax: parsed.data.LOGIN_RATE_LIMIT_MAX,
    loginWindowMs: parsed.data.LOGIN_RATE_LIMIT_WINDOW_MS,
  },

  vapid: {
    publicKey: parsed.data.VAPID_PUBLIC_KEY,
    privateKey: parsed.data.VAPID_PRIVATE_KEY,
    subject: parsed.data.VAPID_SUBJECT,
    enabled: Boolean(parsed.data.VAPID_PUBLIC_KEY && parsed.data.VAPID_PRIVATE_KEY),
  },

  cron: {
    timezone: parsed.data.CRON_TIMEZONE,
    enabled: parsed.data.CRON_ENABLED,
  },

  defaultTimezone: parsed.data.DEFAULT_TIMEZONE,
  inviteCodeTtlHours: parsed.data.INVITE_CODE_TTL_HOURS,
});
