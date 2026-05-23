import { addDays, currentWeekStart, subtractWeeks } from '../../utils/dates.js';
import { findUsersByHousehold } from '../users/users.repository.js';
import { loadStatsByWeek } from './stats.repository.js';

export async function getLoadStats(householdId, weeks) {
  const today = currentWeekStart();
  const nextWeek = addDays(today, 7); // exclusivo
  const from = subtractWeeks(today, weeks - 1);

  const [users, rows] = await Promise.all([
    findUsersByHousehold(householdId),
    loadStatsByWeek(householdId, from, nextWeek),
  ]);

  // Estructura: { week_start: { user_id: { load_score, done_score, ... } } }
  const byWeek = new Map();
  for (const r of rows) {
    const wk = r.week_start instanceof Date ? r.week_start.toISOString().slice(0, 10) : r.week_start;
    if (!byWeek.has(wk)) byWeek.set(wk, {});
    byWeek.get(wk)[r.user_id] = {
      load_score: Number(r.load_score) || 0,
      done_score: Number(r.done_score) || 0,
      total_assignments: Number(r.total_assignments) || 0,
      done_count: Number(r.done_count) || 0,
    };
  }

  // Materializa todas las semanas pedidas (incluso sin datos)
  const series = [];
  let cursor = from;
  while (cursor <= today) {
    const perUser = {};
    for (const u of users) {
      perUser[u.id] = byWeek.get(cursor)?.[u.id] || {
        load_score: 0,
        done_score: 0,
        total_assignments: 0,
        done_count: 0,
      };
    }
    series.push({ week_start: cursor, by_user: perUser });
    cursor = addDays(cursor, 7);
  }

  // Totales
  const totals = {};
  for (const u of users) {
    totals[u.id] = { load_score: 0, done_score: 0, total_assignments: 0, done_count: 0 };
  }
  for (const wk of series) {
    for (const u of users) {
      const v = wk.by_user[u.id];
      totals[u.id].load_score += v.load_score;
      totals[u.id].done_score += v.done_score;
      totals[u.id].total_assignments += v.total_assignments;
      totals[u.id].done_count += v.done_count;
    }
  }

  return {
    weeks,
    from_week_start: from,
    to_week_start: today,
    members: users.map((u) => ({ id: u.id, name: u.name, avatar_color: u.avatar_color })),
    series,
    totals,
  };
}
