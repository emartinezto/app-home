import { verifyAccessToken } from '../utils/jwt.js';
import { E, AppError } from '../utils/errors.js';
import { findUserById } from '../domains/users/users.repository.js';

/**
 * requireAuth: lee Bearer token, valida JWT, carga usuario fresco de BD
 * y lo expone como req.user = { id, household_id, email, name }.
 */
export async function requireAuth(req, _res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      throw E.unauthorized('Falta el header Authorization');
    }
    const token = auth.slice(7).trim();
    if (!token) throw E.unauthorized('Token vacío');

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new AppError('TOKEN_EXPIRED', 401, {
          details: 'El access token ha expirado, usa el refresh',
        });
      }
      throw E.unauthorized('Token inválido');
    }

    const user = await findUserById(payload.sub);
    if (!user) throw E.unauthorized('Usuario no existe');

    req.user = {
      id: user.id,
      household_id: user.household_id,
      email: user.email,
      name: user.name,
    };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * requireHousehold: exige que req.user.household_id no sea null.
 * Útil para endpoints que asumen un hogar.
 */
export function requireHousehold(req, _res, next) {
  if (!req.user?.household_id) {
    return next(E.forbidden('Debes pertenecer a un hogar para acceder a este recurso'));
  }
  next();
}
