import { query } from '../../config/db.js';

export async function loadStatsByWeek(householdId, fromWeekStart, toWeekStart) {
  return query(
    `SELECT a.week_start,
            a.assigned_to AS user_id,
            SUM(t.weight) AS load_score,
            SUM(CASE WHEN a.is_done THEN t.weight ELSE 0 END) AS done_score,
            COUNT(*) AS total_assignments,
            SUM(CASE WHEN a.is_done THEN 1 ELSE 0 END) AS done_count
       FROM weekly_assignments a
       JOIN tasks t ON t.id = a.task_id
      WHERE a.household_id = ?
        AND a.week_start >= ?
        AND a.week_start < ?
      GROUP BY a.week_start, a.assigned_to
      ORDER BY a.week_start ASC`,
    [householdId, fromWeekStart, toWeekStart],
  );
}
