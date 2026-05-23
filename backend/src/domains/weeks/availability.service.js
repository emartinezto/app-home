import { E } from '../../utils/errors.js';
import {
  findAvailabilityByUserAndWeek,
  findAvailabilityByHouseholdAndWeek,
  upsertAvailability,
  confirmAvailability,
} from './availability.repository.js';

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
  return {
    user_id: userId,
    week_start: weekStart,
    office_days: updated.office_days,
    confirmed: updated.confirmed,
    confirmed_at: updated.confirmed_at,
  };
}
