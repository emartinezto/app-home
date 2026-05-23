import { ZodError } from 'zod';
import { E } from '../utils/errors.js';

/**
 * Valida partes de la request con un schema zod.
 * Sustituye req.<part> con el resultado parseado (sanitizado).
 *
 *   validate({ body: schema, params: schema, query: schema })
 */
export function validate(schemas) {
  return (req, _res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
      if (schemas.params) req.params = schemas.params.parse(req.params ?? {});
      if (schemas.query) req.query = schemas.query.parse(req.query ?? {});
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const fields = {};
        for (const issue of err.issues) {
          const path = issue.path.join('.') || '_';
          if (!fields[path]) fields[path] = issue.message;
        }
        return next(E.validation(fields, 'Datos inválidos en la petición'));
      }
      next(err);
    }
  };
}
