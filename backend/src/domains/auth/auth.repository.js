import { query } from '../../config/db.js';

export async function insertRefreshToken(conn, { userId, tokenHash, expiresAt, userAgent, ip }) {
  const exec = conn?.query ?? query;
  await exec(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, tokenHash, expiresAt, userAgent ?? null, ip ?? null],
  );
}

export async function findRefreshTokenByHash(tokenHash) {
  const rows = await query(
    `SELECT id, user_id, token_hash, expires_at, revoked_at
       FROM refresh_tokens
      WHERE token_hash = ?
      LIMIT 1`,
    [tokenHash],
  );
  return rows[0] || null;
}

export async function revokeRefreshTokenById(id, conn) {
  const exec = conn?.query ?? query;
  await exec(
    `UPDATE refresh_tokens
        SET revoked_at = NOW()
      WHERE id = ? AND revoked_at IS NULL`,
    [id],
  );
}

export async function revokeAllUserRefreshTokens(userId) {
  await query(
    `UPDATE refresh_tokens
        SET revoked_at = NOW()
      WHERE user_id = ? AND revoked_at IS NULL`,
    [userId],
  );
}

export async function deleteExpiredRefreshTokens() {
  await query(
    `DELETE FROM refresh_tokens
      WHERE expires_at < NOW() OR revoked_at IS NOT NULL`,
  );
}
