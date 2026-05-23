import { query } from '../../config/db.js';

function parseRow(row) {
  if (!row) return null;
  return {
    ...row,
    office_days:
      typeof row.office_days === 'string' ? JSON.parse(row.office_days) : row.office_days || [],
    confirmed: Boolean(row.confirmed),
  };
}

export async function findAvailabilityByUserAndWeek(userId, weekStart, conn) {
  const exec = conn?.query ?? query;
  const rows = await exec(
    `SELECT id, user_id, household_id, week_start, office_days, confirmed, confirmed_at, created_at, updated_at
       FROM weekly_availability
      WHERE user_id = ? AND week_start = ?
      LIMIT 1`,
    [userId, weekStart],
  );
  return parseRow(rows[0]);
}

export async function findAvailabilityByHouseholdAndWeek(householdId, weekStart, conn) {
  const exec = conn?.query ?? query;
  const rows = await exec(
    `SELECT id, user_id, household_id, week_start, office_days, confirmed, confirmed_at, created_at, updated_at
       FROM weekly_availability
      WHERE household_id = ? AND week_start = ?`,
    [householdId, weekStart],
  );
  return rows.map(parseRow);
}

export async function upsertAvailability(
  userId,
  householdId,
  weekStart,
  officeDays,
) {
  await query(
    `INSERT INTO weekly_availability (user_id, household_id, week_start, office_days, confirmed)
     VALUES (?, ?, ?, ?, FALSE)
     ON CONFLICT (user_id, week_start) DO UPDATE SET
        office_days = EXCLUDED.office_days,
        household_id = EXCLUDED.household_id`,
    [userId, householdId, weekStart, JSON.stringify(officeDays)],
  );
}

export async function confirmAvailability(userId, weekStart) {
  const result = await query(
    `UPDATE weekly_availability
        SET confirmed = TRUE, confirmed_at = NOW()
      WHERE user_id = ? AND week_start = ?`,
    [userId, weekStart],
  );
  return result.affectedRows > 0;
}

export async function findHistoricalAvailability(householdId, fromWeekStart, toWeekStart) {
  return query(
    `SELECT user_id, week_start, office_days
       FROM weekly_availability
      WHERE household_id = ? AND week_start >= ? AND week_start < ?`,
    [householdId, fromWeekStart, toWeekStart],
  );
}
