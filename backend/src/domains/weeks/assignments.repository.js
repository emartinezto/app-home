import { query } from '../../config/db.js';

const ASSIGN_COLS = `
  id, proposal_id, household_id, week_start, task_id, assigned_to,
  day_of_week, is_done, done_at, done_by, soft_violation, created_at, updated_at
`;

function parseRow(row) {
  if (!row) return null;
  return {
    ...row,
    is_done: Boolean(row.is_done),
    soft_violation: Boolean(row.soft_violation),
  };
}

export async function listAssignmentsByProposal(proposalId, conn) {
  const exec = conn?.query ?? query;
  const rows = await exec(
    `SELECT a.id, a.proposal_id, a.household_id, a.week_start, a.task_id, a.assigned_to,
            a.day_of_week, a.is_done, a.done_at, a.done_by, a.soft_violation,
            a.created_at, a.updated_at,
            t.name AS task_name, t.category AS task_category, t.weight AS task_weight,
            t.time_slot AS task_time_slot, t.frequency AS task_frequency
       FROM weekly_assignments a
       JOIN tasks t ON t.id = a.task_id
      WHERE a.proposal_id = ?
      ORDER BY a.day_of_week ASC, a.id ASC`,
    [proposalId],
  );
  return rows.map(parseRow);
}

export async function listAssignmentsByHouseholdAndWeek(householdId, weekStart) {
  const rows = await query(
    `SELECT a.id, a.proposal_id, a.household_id, a.week_start, a.task_id, a.assigned_to,
            a.day_of_week, a.is_done, a.done_at, a.done_by, a.soft_violation,
            a.created_at, a.updated_at,
            t.name AS task_name, t.category AS task_category, t.weight AS task_weight,
            t.time_slot AS task_time_slot, t.frequency AS task_frequency
       FROM weekly_assignments a
       JOIN tasks t ON t.id = a.task_id
      WHERE a.household_id = ? AND a.week_start = ?
      ORDER BY a.day_of_week ASC, t.weight DESC, a.id ASC`,
    [householdId, weekStart],
  );
  return rows.map(parseRow);
}

export async function findAssignmentById(id, conn) {
  const exec = conn?.query ?? query;
  const rows = await exec(
    `SELECT a.id, a.proposal_id, a.household_id, a.week_start, a.task_id, a.assigned_to,
            a.day_of_week, a.is_done, a.done_at, a.done_by, a.soft_violation,
            a.created_at, a.updated_at,
            t.name AS task_name, t.category AS task_category, t.weight AS task_weight,
            t.time_slot AS task_time_slot, t.frequency AS task_frequency
       FROM weekly_assignments a
       JOIN tasks t ON t.id = a.task_id
      WHERE a.id = ?
      LIMIT 1`,
    [id],
  );
  return parseRow(rows[0]);
}

export async function deleteAssignmentsByProposal(conn, proposalId) {
  const exec = conn?.query ?? query;
  await exec(`DELETE FROM weekly_assignments WHERE proposal_id = ?`, [proposalId]);
}

export async function bulkInsertAssignments(conn, rows) {
  if (rows.length === 0) return;
  const exec = conn?.query ?? query;
  const values = [];
  const placeholders = rows
    .map(() => '(?, ?, ?, ?, ?, ?, ?)')
    .join(', ');
  for (const r of rows) {
    values.push(
      r.proposal_id,
      r.household_id,
      r.week_start,
      r.task_id,
      r.assigned_to,
      r.day_of_week,
      !!r.soft_violation,
    );
  }
  await exec(
    `INSERT INTO weekly_assignments
      (proposal_id, household_id, week_start, task_id, assigned_to, day_of_week, soft_violation)
     VALUES ${placeholders}`,
    values,
  );
}

export async function insertSingleAssignment(conn, row) {
  const exec = conn?.query ?? query;
  const result = await exec(
    `INSERT INTO weekly_assignments
      (proposal_id, household_id, week_start, task_id, assigned_to, day_of_week, soft_violation)
     VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    [
      row.proposal_id,
      row.household_id,
      row.week_start,
      row.task_id,
      row.assigned_to,
      row.day_of_week,
      !!row.soft_violation,
    ],
  );
  return result.insertId;
}

export async function markAssignmentDone(id, householdId, doneBy) {
  const result = await query(
    `UPDATE weekly_assignments
        SET is_done = TRUE, done_at = NOW(), done_by = ?
      WHERE id = ? AND household_id = ? AND is_done = FALSE`,
    [doneBy, id, householdId],
  );
  return result.affectedRows > 0;
}

export async function markAssignmentUndone(id, householdId) {
  const result = await query(
    `UPDATE weekly_assignments
        SET is_done = FALSE, done_at = NULL, done_by = NULL
      WHERE id = ? AND household_id = ? AND is_done = TRUE`,
    [id, householdId],
  );
  return result.affectedRows > 0;
}

export async function reassignAssignment(conn, id, newUserId) {
  const exec = conn?.query ?? query;
  await exec(`UPDATE weekly_assignments SET assigned_to = ? WHERE id = ?`, [newUserId, id]);
}

export async function listAssignmentsForLoadHistory(householdId, fromWeekStart, toWeekStart) {
  return query(
    `SELECT a.assigned_to, a.week_start, t.name AS task_name, t.weight, a.day_of_week, a.is_done
       FROM weekly_assignments a
       JOIN tasks t ON t.id = a.task_id
      WHERE a.household_id = ? AND a.week_start >= ? AND a.week_start < ?`,
    [householdId, fromWeekStart, toWeekStart],
  );
}
