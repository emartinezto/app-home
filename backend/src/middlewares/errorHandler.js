import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { config } from '../config/env.js';

const MYSQL_DUP = 'ER_DUP_ENTRY';
const MYSQL_TRIGGER = 'ER_SIGNAL_EXCEPTION';

/**
 * Mapea errores MySQL conocidos a AppError según contexto en el message.
 * Algunos triggers pueden lanzar SIGNAL con MESSAGE_TEXT específico
 * (ej. "HOUSEHOLD_FULL"); lo respetamos.
 */
function mapMysqlError(err) {
  if (err.code === MYSQL_DUP) {
    const msg = String(err.sqlMessage || '');
    if (msg.includes('uq_users_email')) {
      return new AppError('EMAIL_TAKEN', 409, { details: 'Ese email ya está en uso' });
    }
    if (msg.includes('uq_households_invite_code')) {
      return new AppError('INVITE_CODE_TAKEN', 409, {
        details: 'Conflicto generando el código, reintenta',
      });
    }
    if (msg.includes('uq_avail_user_week')) {
      return new AppError('AVAILABILITY_DUPLICATE', 409, {
        details: 'Ya existe disponibilidad para esa semana',
      });
    }
    if (msg.includes('uq_proposal_household_week')) {
      return new AppError('PROPOSAL_ALREADY_ACTIVE', 409, {
        details: 'Ya hay una propuesta para esa semana',
      });
    }
    if (msg.includes('uq_ps_endpoint')) {
      return new AppError('SUBSCRIPTION_EXISTS', 409, {
        details: 'Ya hay una suscripción para este endpoint',
      });
    }
    return new AppError('CONFLICT', 409, { details: 'Conflicto de unicidad' });
  }
  if (err.code === MYSQL_TRIGGER) {
    const msg = String(err.sqlMessage || '').toUpperCase();
    if (msg.includes('HOUSEHOLD_FULL')) {
      return new AppError('HOUSEHOLD_FULL', 409, {
        details: 'El hogar ya tiene 2 miembros',
      });
    }
  }
  return null;
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let appErr;

  if (err instanceof AppError) {
    appErr = err;
  } else if (err instanceof ZodError) {
    const fields = {};
    for (const issue of err.issues) {
      const path = issue.path.join('.') || '_';
      if (!fields[path]) fields[path] = issue.message;
    }
    appErr = new AppError('VALIDATION', 400, { fields, details: 'Datos inválidos' });
  } else {
    const mapped = mapMysqlError(err);
    if (mapped) appErr = mapped;
  }

  if (!appErr) {
    appErr = new AppError('INTERNAL', 500, { details: 'Error interno del servidor' });
    req.log?.error({ err: { message: err.message, stack: err.stack, code: err.code } }, 'unhandled');
  } else if (appErr.status >= 500) {
    req.log?.error({ err: { message: err.message, stack: err.stack } }, 'app-error');
  }

  const body = { error: appErr.code };
  if (appErr.fields) body.fields = appErr.fields;
  if (appErr.details) body.details = appErr.details;
  if (!config.isProd && appErr.status >= 500) {
    body._stack = err.stack;
  }

  res.status(appErr.status).json(body);
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'NOT_FOUND',
    details: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
}
