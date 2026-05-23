import { query } from '../../config/db.js';

function parseRow(row) {
  if (!row) return null;
  return {
    ...row,
    notes: row.notes
      ? typeof row.notes === 'string'
        ? JSON.parse(row.notes)
        : row.notes
      : null,
    user1_load_score: row.user1_load_score !== null ? Number(row.user1_load_score) : null,
    user2_load_score: row.user2_load_score !== null ? Number(row.user2_load_score) : null,
  };
}

export async function findProposalByHouseholdAndWeek(householdId, weekStart, conn) {
  const exec = conn?.query ?? query;
  const rows = await exec(
    `SELECT id, household_id, week_start, status, generated_at,
            user1_id, user2_id, user1_confirmed_at, user2_confirmed_at,
            user1_load_score, user2_load_score, algorithm_version, notes,
            created_at, updated_at
       FROM weekly_proposals
      WHERE household_id = ? AND week_start = ?
      LIMIT 1`,
    [householdId, weekStart],
  );
  return parseRow(rows[0]);
}

export async function findProposalById(id, conn) {
  const exec = conn?.query ?? query;
  const rows = await exec(
    `SELECT id, household_id, week_start, status, generated_at,
            user1_id, user2_id, user1_confirmed_at, user2_confirmed_at,
            user1_load_score, user2_load_score, algorithm_version, notes,
            created_at, updated_at
       FROM weekly_proposals
      WHERE id = ?
      LIMIT 1`,
    [id],
  );
  return parseRow(rows[0]);
}

export async function insertProposal(conn, { householdId, weekStart, user1Id, user2Id }) {
  const exec = conn?.query ?? query;
  const result = await exec(
    `INSERT INTO weekly_proposals (household_id, week_start, status, user1_id, user2_id, algorithm_version)
     VALUES (?, ?, 'draft', ?, ?, 'v1') RETURNING id`,
    [householdId, weekStart, user1Id, user2Id],
  );
  return result.insertId;
}

export async function updateProposalGenerated(conn, id, { user1Load, user2Load, notes, status }) {
  await conn.query(
    `UPDATE weekly_proposals
        SET status = ?,
            generated_at = NOW(),
            user1_load_score = ?,
            user2_load_score = ?,
            notes = ?
      WHERE id = ?`,
    [status, user1Load, user2Load, JSON.stringify(notes), id],
  );
}

export async function deleteProposal(conn, id) {
  await conn.query(`DELETE FROM weekly_proposals WHERE id = ?`, [id]);
}

export async function setProposalStatus(conn, id, status) {
  const exec = conn?.query ?? query;
  await exec(`UPDATE weekly_proposals SET status = ? WHERE id = ?`, [status, id]);
}

export async function setProposalUserConfirm(conn, id, userSlot) {
  const exec = conn?.query ?? query;
  const col = userSlot === 1 ? 'user1_confirmed_at' : 'user2_confirmed_at';
  await exec(
    `UPDATE weekly_proposals SET ${col} = NOW() WHERE id = ?`,
    [id],
  );
}

export async function listHouseholdProposalsRange(householdId, fromWeekStart, toWeekStart) {
  return query(
    `SELECT id, week_start, status, user1_id, user2_id, user1_load_score, user2_load_score
       FROM weekly_proposals
      WHERE household_id = ? AND week_start >= ? AND week_start < ?
      ORDER BY week_start ASC`,
    [householdId, fromWeekStart, toWeekStart],
  );
}
