import { query } from '../../config/db.js';

export async function createHousehold(conn, { name, timezone, inviteCode, inviteExpiresAt }) {
  const exec = conn?.query ?? query;
  const result = await exec(
    `INSERT INTO households (name, invite_code, invite_code_expires_at, timezone)
     VALUES (?, ?, ?, ?) RETURNING id`,
    [name, inviteCode, inviteExpiresAt, timezone],
  );
  return result.insertId;
}

export async function findHouseholdById(id, conn) {
  const exec = conn?.query ?? query;
  const rows = await exec(
    `SELECT id, name, invite_code, invite_code_expires_at, timezone, archived_at, created_at, updated_at
       FROM households
      WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

export async function findHouseholdByInviteCode(code) {
  const rows = await query(
    `SELECT id, name, invite_code, invite_code_expires_at, timezone, archived_at
       FROM households
      WHERE invite_code = ?
      LIMIT 1`,
    [code],
  );
  return rows[0] || null;
}

export async function updateInviteCode(householdId, { code, expiresAt }) {
  await query(
    `UPDATE households SET invite_code = ?, invite_code_expires_at = ? WHERE id = ?`,
    [code, expiresAt, householdId],
  );
}

export async function clearInviteCode(conn, householdId) {
  const exec = conn?.query ?? query;
  await exec(
    `UPDATE households SET invite_code = NULL, invite_code_expires_at = NULL WHERE id = ?`,
    [householdId],
  );
}

export async function updateHouseholdSettings(householdId, { name, timezone }) {
  const fields = [];
  const params = [];
  if (name !== undefined) {
    fields.push('name = ?');
    params.push(name);
  }
  if (timezone !== undefined) {
    fields.push('timezone = ?');
    params.push(timezone);
  }
  if (fields.length === 0) return;
  params.push(householdId);
  await query(`UPDATE households SET ${fields.join(', ')} WHERE id = ?`, params);
}

export async function archiveHousehold(conn, householdId) {
  const exec = conn?.query ?? query;
  await exec(
    `UPDATE households SET archived_at = NOW() WHERE id = ? AND archived_at IS NULL`,
    [householdId],
  );
}

export async function listActiveHouseholds() {
  return query(
    `SELECT id, name, timezone FROM households WHERE archived_at IS NULL`,
  );
}
