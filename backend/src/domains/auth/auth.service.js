import { withTransaction } from '../../config/db.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  refreshExpiryDate,
} from '../../utils/jwt.js';
import { E } from '../../utils/errors.js';
import {
  insertRefreshToken,
  findRefreshTokenByHash,
  revokeRefreshTokenById,
  revokeAllUserRefreshTokens,
} from './auth.repository.js';
import { createUser, findUserByEmail, findUserById } from '../users/users.repository.js';

function publicUser(u) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    household_id: u.household_id,
    avatar_color: u.avatar_color,
    work_schedule: u.work_schedule ?? null,
  };
}

async function issueTokens({ user, conn, userAgent, ip }) {
  const accessToken = signAccessToken({ sub: user.id, email: user.email });
  const refreshToken = generateRefreshToken();
  const tokenHash = hashRefreshToken(refreshToken);
  const expiresAt = refreshExpiryDate();
  await insertRefreshToken(conn, {
    userId: user.id,
    tokenHash,
    expiresAt,
    userAgent,
    ip,
  });
  return { accessToken, refreshToken };
}

export async function signup({ email, password, name, avatar_color }, ctx = {}) {
  const existing = await findUserByEmail(email);
  if (existing) throw E.conflict('EMAIL_TAKEN', 'Ese email ya está registrado');

  const password_hash = await hashPassword(password);

  const result = await withTransaction(async (conn) => {
    const userId = await createUser(conn, {
      email,
      password_hash,
      name,
      avatar_color,
    });
    const user = await findUserById(userId, conn);
    const { accessToken, refreshToken } = await issueTokens({
      user,
      conn,
      userAgent: ctx.userAgent,
      ip: ctx.ip,
    });
    return { user, accessToken, refreshToken };
  });

  return {
    user: publicUser(result.user),
    access_token: result.accessToken,
    refresh_token: result.refreshToken,
  };
}

export async function login({ email, password }, ctx = {}) {
  const user = await findUserByEmail(email);
  if (!user) throw E.invalidCredentials();

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) throw E.invalidCredentials();

  const result = await withTransaction(async (conn) => {
    const { accessToken, refreshToken } = await issueTokens({
      user,
      conn,
      userAgent: ctx.userAgent,
      ip: ctx.ip,
    });
    await conn.query(
      `UPDATE users SET last_seen_at = NOW() WHERE id = ?`,
      [user.id],
    );
    return { accessToken, refreshToken };
  });

  return {
    user: publicUser(user),
    access_token: result.accessToken,
    refresh_token: result.refreshToken,
  };
}

export async function refresh({ refresh_token }, ctx = {}) {
  const tokenHash = hashRefreshToken(refresh_token);
  const stored = await findRefreshTokenByHash(tokenHash);
  if (!stored) throw E.unauthorized('Refresh token inválido');
  if (stored.revoked_at) throw E.unauthorized('Refresh token revocado');
  if (new Date(stored.expires_at).getTime() < Date.now()) {
    throw E.unauthorized('Refresh token expirado');
  }

  const user = await findUserById(stored.user_id);
  if (!user) throw E.unauthorized('Usuario no existe');

  // Rotación: revoca el viejo y emite uno nuevo en la misma transacción
  const result = await withTransaction(async (conn) => {
    await revokeRefreshTokenById(stored.id, conn);
    return issueTokens({ user, conn, userAgent: ctx.userAgent, ip: ctx.ip });
  });

  return {
    access_token: result.accessToken,
    refresh_token: result.refreshToken,
  };
}

export async function logout({ refresh_token }) {
  const tokenHash = hashRefreshToken(refresh_token);
  const stored = await findRefreshTokenByHash(tokenHash);
  if (!stored) return; // idempotente
  if (!stored.revoked_at) await revokeRefreshTokenById(stored.id);
}

export async function logoutAll(userId) {
  await revokeAllUserRefreshTokens(userId);
}
