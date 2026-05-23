/**
 * Error de negocio / aplicación. Lo lanza cualquier capa y lo formatea
 * el errorHandler con el contrato { error, fields?, details? }.
 */
export class AppError extends Error {
  /**
   * @param {string} code     Código en MAYÚSCULAS_SNAKE (ej: 'EMAIL_TAKEN')
   * @param {number} status   Código HTTP
   * @param {object} [opts]
   * @param {object} [opts.fields]   Errores por campo (validación)
   * @param {string} [opts.details]  Mensaje legible
   * @param {Error}  [opts.cause]    Error original (interno)
   */
  constructor(code, status, opts = {}) {
    super(opts.details || code);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.fields = opts.fields;
    this.details = opts.details;
    if (opts.cause) this.cause = opts.cause;
  }
}

// Atajos comunes
export const E = {
  validation: (fields, details = 'Datos inválidos') =>
    new AppError('VALIDATION', 400, { fields, details }),
  unauthorized: (details = 'No autenticado') => new AppError('NO_AUTH', 401, { details }),
  invalidCredentials: () =>
    new AppError('INVALID_CREDENTIALS', 401, { details: 'Email o contraseña incorrectos' }),
  forbidden: (details = 'No tienes permiso para acceder a este recurso') =>
    new AppError('NOT_YOUR_HOUSEHOLD', 403, { details }),
  notFound: (details = 'Recurso no encontrado') => new AppError('NOT_FOUND', 404, { details }),
  conflict: (code, details) => new AppError(code, 409, { details }),
  unprocessable: (code, details) => new AppError(code, 422, { details }),
  tooMany: (details = 'Demasiados intentos, prueba más tarde') =>
    new AppError('TOO_MANY_ATTEMPTS', 429, { details }),
  internal: (details = 'Error interno') => new AppError('INTERNAL', 500, { details }),
};
