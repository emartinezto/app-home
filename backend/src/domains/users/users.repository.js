import { query } from '../../config/db.js';

const USER_COLS = `
  id, household_id, email, password_hash, name, work_schedule, avatar_color,
  last_seen_at, created_at, updated_at
`;

function parseUser(row) {
  if (!row) return null;
  return {
    ...row,
    work_schedule:
      row.work_schedule && typeof row.work_schedule === 'string'
        ? JSON.parse(row.work_schedule)
        : row.work_schedule ?? null,
  };
}

export async function findUserById(id, conn) {
  const exec = conn?.query ?? query;
  const rows = await exec(`SELECT ${USER_COLS} FROM users WHERE id = ? LIMIT 1`, [id]);
  return parseUser(rows[0]);
}

export async function findUserByEmail(email) {
  const rows = await query(`SELECT ${USER_COLS} FROM users WHERE email = ? LIMIT 1`, [email]);
  return parseUser(rows[0]);
}

export async function findUsersByHousehold(householdId, conn) {
  const exec = conn?.query ?? query;
  const rows = await exec(
    `SELECT ${USER_COLS} FROM users WHERE household_id = ? ORDER BY id ASC`,
    [householdId],
  );
  return rows.map(parseUser);
}

export async function createUser(conn, { email, password_hash, name, avatar_color }) {
  const exec = conn?.query ?? query;
  const result = await exec(
    `INSERT INTO users (email, password_hash, name, work_schedule, avatar_color)
     VALUES (?, ?, ?, ?, ?) RETURNING id`,
    [email, password_hash, name, JSON.stringify({}), avatar_color || '#3B82F6'],
  );
  return result.insertId;
}

export async function updateUserProfile(userId, { name, avatar_color }) {
  const fields = [];
  const params = [];
  if (name !== undefined) {
    fields.push('name = ?');
    params.push(name);
  }
  if (avatar_color !== undefined) {
    fields.push('avatar_color = ?');
    params.push(avatar_color);
  }
  if (fields.length === 0) return;
  params.push(userId);
  await query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
}

export async function updatePasswordHash(userId, passwordHash) {
  await query(`UPDATE users SET password_hash = ? WHERE id = ?`, [passwordHash, userId]);
}

export async function updateWorkSchedule(userId, schedule) {
  await query(`UPDATE users SET work_schedule = ? WHERE id = ?`, [
    JSON.stringify(schedule),
    userId,
  ]);
}

export async function setUserHousehold(conn, userId, householdId) {
  const exec = conn?.query ?? query;
  await exec(`UPDATE users SET household_id = ? WHERE id = ?`, [householdId, userId]);
}

export async function deleteUser(conn, userId) {
  const exec = conn?.query ?? query;
  await exec(`DELETE FROM users WHERE id = ?`, [userId]);
}

export async function countHouseholdMembers(conn, householdId) {
  const exec = conn?.query ?? query;
  const rows = await exec(
    `SELECT COUNT(*) AS n FROM users WHERE household_id = ?`,
    [householdId],
  );
  return Number(rows[0].n);
}

// ---------- Push subscriptions ----------

export async function insertPushSubscription(userId, { endpoint, p256dh_key, auth_key, user_agent }) {
  const result = await query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh_key, auth_key, user_agent)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (endpoint) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        p256dh_key = EXCLUDED.p256dh_key,
        auth_key = EXCLUDED.auth_key,
        user_agent = EXCLUDED.user_agent
     RETURNING id`,
    [userId, endpoint, p256dh_key, auth_key, user_agent ?? null],
  );
  return result.insertId;
}

export async function findPushSubscriptionsByUser(userId) {
  return query(
    `SELECT id, endpoint, p256dh_key, auth_key, user_agent, last_used_at, created_at
       FROM push_subscriptions
      WHERE user_id = ?`,
    [userId],
  );
}

export async function deletePushSubscription(userId, subId) {
  const result = await query(
    `DELETE FROM push_subscriptions WHERE id = ? AND user_id = ?`,
    [subId, userId],
  );
  return result.affectedRows > 0;
}

export async function deletePushSubscriptionByEndpoint(endpoint) {
  await query(`DELETE FROM push_subscriptions WHERE endpoint = ?`, [endpoint]);
}

export async function touchPushSubscription(id) {
  await query(`UPDATE push_subscriptions SET last_used_at = NOW() WHERE id = ?`, [id]);
}
