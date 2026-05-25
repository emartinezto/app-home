import { withTransaction } from '../../config/db.js';
import { E } from '../../utils/errors.js';
import {
  findUserById,
  findUsersByHousehold,
  updateUserProfile,
  updatePasswordHash,
  updateWorkSchedule,
  insertPushSubscription,
  findPushSubscriptionsByUser,
  deletePushSubscription,
  deleteUser,
} from './users.repository.js';
import { archiveHousehold } from '../households/households.repository.js';
import { revokeAllUserRefreshTokens } from '../auth/auth.repository.js';
import { hashPassword } from '../../utils/password.js';

function publicUser(u) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    household_id: u.household_id,
    avatar_color: u.avatar_color,
    work_schedule: u.work_schedule ?? {},
    last_seen_at: u.last_seen_at,
    created_at: u.created_at,
  };
}

export async function getMe(userId) {
  const user = await findUserById(userId);
  if (!user) throw E.notFound('Usuario no encontrado');
  return { user: publicUser(user) };
}

export async function patchMe(userId, body) {
  await updateUserProfile(userId, body);
  const user = await findUserById(userId);
  return { user: publicUser(user) };
}

export async function setWorkSchedule(userId, schedule) {
  await updateWorkSchedule(userId, schedule);
  const user = await findUserById(userId);
  return { work_schedule: user.work_schedule };
}

export async function addPushSubscription(userId, { endpoint, keys }, userAgent) {
  const id = await insertPushSubscription(userId, {
    endpoint,
    p256dh_key: keys.p256dh,
    auth_key: keys.auth,
    user_agent: userAgent,
  });
  return { id, endpoint };
}

export async function listPushSubscriptions(userId) {
  const rows = await findPushSubscriptionsByUser(userId);
  return { subscriptions: rows };
}

export async function removePushSubscription(userId, subId) {
  const ok = await deletePushSubscription(userId, subId);
  if (!ok) throw E.notFound('Suscripción no encontrada');
}

/**
 * Borra cuenta. Si el usuario es el último miembro de su hogar,
 * archiva el hogar. Revoca todos los refresh tokens.
 */
export async function deleteMyAccount(userId) {
  await withTransaction(async (conn) => {
    const userRows = await conn.query(
      `SELECT id, household_id FROM users WHERE id = ? FOR UPDATE`,
      [userId],
    );
    if (userRows.length === 0) throw E.notFound('Usuario no encontrado');
    const householdId = userRows[0].household_id;

    let willArchive = false;
    if (householdId) {
      const others = await conn.query(
        `SELECT COUNT(*) AS n FROM users WHERE household_id = ? AND id != ?`,
        [householdId, userId],
      );
      if (Number(others[0].n) === 0) willArchive = true;
    }

    await deleteUser(conn, userId);
    if (willArchive) await archiveHousehold(conn, householdId);
  });
  await revokeAllUserRefreshTokens(userId).catch(() => {}); // user ya borrado, irrelevante si falla
}

export async function resetPartnerPassword(callerUserId, newPassword) {
  const me = await findUserById(callerUserId);
  if (!me) throw E.notFound('Usuario no encontrado');
  if (!me.household_id) {
    throw E.unprocessable('NO_HOUSEHOLD', 'No perteneces a un hogar');
  }
  const members = await findUsersByHousehold(me.household_id);
  const partner = members.find((m) => Number(m.id) !== Number(callerUserId));
  if (!partner) {
    throw E.unprocessable('NO_PARTNER', 'Tu hogar no tiene pareja');
  }
  const passwordHash = await hashPassword(newPassword);
  await updatePasswordHash(partner.id, passwordHash);
  // Cierra cualquier sesión activa del partner para que tenga que entrar con la nueva.
  await revokeAllUserRefreshTokens(partner.id).catch(() => {});
  return { partner_id: Number(partner.id), partner_name: partner.name };
}

export { findUsersByHousehold };
