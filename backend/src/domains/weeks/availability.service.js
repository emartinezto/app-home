import { E } from '../../utils/errors.js';
import { logger } from '../../config/logger.js';
import {
  findAvailabilityByUserAndWeek,
  findAvailabilityByHouseholdAndWeek,
  upsertAvailability,
  confirmAvailability,
} from './availability.repository.js';
import { findUserById, findUsersByHousehold } from '../users/users.repository.js';
import { findProposalByHouseholdAndWeek } from './proposals.repository.js';
import { generateForWeek } from './proposals.service.js';

async function maybeAutoGenerateProposal(userId, weekStart) {
  try {
    const user = await findUserById(userId);
    if (!user?.household_id) return;
    const householdId = user.household_id;
    const members = await findUsersByHousehold(householdId);
    if (members.length < 2) return;
    const avail = await findAvailabilityByHouseholdAndWeek(householdId, weekStart);
    const memberIds = members.map((m) => Number(m.id));
    const confirmedIds = new Set(
      avail.filter((a) => a.confirmed).map((a) => Number(a.user_id)),
    );
    if (!memberIds.every((id) => confirmedIds.has(id))) return;
    const existing = await findProposalByHouseholdAndWeek(householdId, weekStart);
    if (existing && (existing.status === 'pending_confirmation' || existing.status === 'active')) {
      return;
    }
    await generateForWeek(householdId, weekStart);
    logger.info({ household_id: householdId, week_start: weekStart }, 'propuesta auto-generada al confirmar disponibilidad');
  } catch (err) {
    logger.error({ err, user_id: userId, week_start: weekStart }, 'maybeAutoGenerateProposal falló');
  }
}

export async function getAvailabilityForWeek(householdId, weekStart) {
  const rows = await findAvailabilityByHouseholdAndWeek(householdId, weekStart);
  const out = {};
  for (const r of rows) {
    out[r.user_id] = {
      office_days: r.office_days,
      confirmed: r.confirmed,
      confirmed_at: r.confirmed_at,
      updated_at: r.updated_at,
    };
  }
  return { week_start: weekStart, availability: out };
}

export async function setMyAvailability(userId, householdId, weekStart, { office_days }) {
  await upsertAvailability(userId, householdId, weekStart, office_days);
  const row = await findAvailabilityByUserAndWeek(userId, weekStart);
  return {
    user_id: userId,
    week_start: weekStart,
    office_days: row.office_days,
    confirmed: row.confirmed,
  };
}

export async function confirmMyAvailability(userId, weekStart) {
  const existing = await findAvailabilityByUserAndWeek(userId, weekStart);
  if (!existing) {
    throw E.unprocessable(
      'AVAILABILITY_MISSING',
      'Define office_days antes de confirmar',
    );
  }
  await confirmAvailability(userId, weekStart);
  const updated = await findAvailabilityByUserAndWeek(userId, weekStart);

  // Fire-and-forget: si al confirmar ya están ambos confirmados,
  // generamos la propuesta automáticamente sin esperar al cron del domingo.
  void maybeAutoGenerateProposal(userId, weekStart);

  return {
    user_id: userId,
    week_start: weekStart,
    office_days: updated.office_days,
    confirmed: updated.confirmed,
    confirmed_at: updated.confirmed_at,
  };
}
