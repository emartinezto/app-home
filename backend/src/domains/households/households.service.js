import { config } from '../../config/env.js';
import { withTransaction } from '../../config/db.js';
import { E } from '../../utils/errors.js';
import { generateInviteCode } from '../../utils/invite-code.js';
import {
  createHousehold,
  findHouseholdById,
  findHouseholdByInviteCode,
  updateInviteCode,
} from './households.repository.js';
import { findUsersByHousehold, setUserHousehold } from '../users/users.repository.js';

function inviteExpiresAt() {
  const d = new Date();
  d.setUTCHours(d.getUTCHours() + config.inviteCodeTtlHours);
  return d;
}

async function generateUniqueInviteCode(conn) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateInviteCode(6);
    const existing = await conn.query(
      `SELECT id FROM households WHERE invite_code = ? LIMIT 1`,
      [code],
    );
    if (existing.length === 0) return code;
  }
  throw E.internal('No se pudo generar un código de invitación único');
}

function publicMember(u) {
  return { id: u.id, name: u.name, avatar_color: u.avatar_color };
}

export async function createHouseholdForUser(userId, { name, timezone }) {
  return withTransaction(async (conn) => {
    // 1 usuario solo puede pertenecer a 1 hogar a la vez
    const userRows = await conn.query(
      `SELECT id, household_id FROM users WHERE id = ? FOR UPDATE`,
      [userId],
    );
    if (userRows.length === 0) throw E.notFound('Usuario no encontrado');
    if (userRows[0].household_id) {
      throw E.conflict('ALREADY_IN_HOUSEHOLD', 'Ya perteneces a un hogar');
    }

    const code = await generateUniqueInviteCode(conn);
    const householdId = await createHousehold(conn, {
      name,
      timezone: timezone || config.defaultTimezone,
      inviteCode: code,
      inviteExpiresAt: inviteExpiresAt(),
    });
    await setUserHousehold(conn, userId, householdId);

    const household = await findHouseholdById(householdId, conn);
    const members = await findUsersByHousehold(householdId, conn);
    return {
      household: {
        id: household.id,
        name: household.name,
        timezone: household.timezone,
        invite_code: household.invite_code,
        invite_code_expires_at: household.invite_code_expires_at,
        members: members.map(publicMember),
      },
    };
  });
}

export async function joinHousehold(userId, { invite_code }) {
  const household = await findHouseholdByInviteCode(invite_code);
  if (!household) throw E.notFound('Código de invitación no encontrado');
  if (household.archived_at) {
    throw E.unprocessable('HOUSEHOLD_ARCHIVED', 'Ese hogar está archivado');
  }
  if (
    household.invite_code_expires_at &&
    new Date(household.invite_code_expires_at).getTime() < Date.now()
  ) {
    throw E.unprocessable('INVITE_CODE_EXPIRED', 'El código de invitación ha caducado');
  }

  return withTransaction(async (conn) => {
    const userRows = await conn.query(
      `SELECT id, household_id FROM users WHERE id = ? FOR UPDATE`,
      [userId],
    );
    if (userRows.length === 0) throw E.notFound('Usuario no encontrado');
    if (userRows[0].household_id === household.id) {
      // idempotente: ya estás dentro
    } else if (userRows[0].household_id) {
      throw E.conflict('ALREADY_IN_HOUSEHOLD', 'Ya perteneces a otro hogar');
    } else {
      // Esto puede disparar el trigger HOUSEHOLD_FULL → mapeado en errorHandler
      await setUserHousehold(conn, userId, household.id);
    }

    const fullHh = await findHouseholdById(household.id, conn);
    const members = await findUsersByHousehold(household.id, conn);
    return {
      household: {
        id: fullHh.id,
        name: fullHh.name,
        timezone: fullHh.timezone,
        members: members.map(publicMember),
      },
    };
  });
}

export async function getMyHousehold(householdId) {
  const household = await findHouseholdById(householdId);
  if (!household) throw E.notFound('Hogar no encontrado');
  const members = await findUsersByHousehold(householdId);
  return {
    household: {
      id: household.id,
      name: household.name,
      timezone: household.timezone,
      invite_code: household.invite_code,
      invite_code_expires_at: household.invite_code_expires_at,
      archived_at: household.archived_at,
      members: members.map(publicMember),
    },
  };
}

export async function regenerateInviteCode(householdId) {
  return withTransaction(async (conn) => {
    const code = await generateUniqueInviteCode(conn);
    const expiresAt = inviteExpiresAt();
    await updateInviteCode(householdId, { code, expiresAt });
    return { invite_code: code, invite_code_expires_at: expiresAt };
  });
}
