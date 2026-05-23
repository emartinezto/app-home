import pino from 'pino';
import { config } from './env.js';

const transport = config.isDev
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:HH:MM:ss.l',
        ignore: 'pid,hostname',
      },
    }
  : undefined;

export const logger = pino({
  level: config.logLevel,
  base: { env: config.env },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'password_hash',
      '*.password',
      '*.password_hash',
      'access_token',
      'refresh_token',
      '*.access_token',
      '*.refresh_token',
    ],
    censor: '[REDACTED]',
  },
  transport,
});

export function childLogger(bindings) {
  return logger.child(bindings);
}
