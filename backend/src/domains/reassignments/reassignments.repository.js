import { query } from '../../config/db.js';

const COLS = `
  id, assignment_id, household_id, requested_by, requested_to, reason,
  status, rejection_reason, responded_at, created_at, updated_at
`;

export async function insertRequest(conn, row) {
  const exec = conn?.query ?? query;
  const result = await exec(
    `INSERT INTO reassignment_requests
      (assignment_id, household_id, requested_by, requested_to, reason, status)
     VALUES (?, ?, ?, ?, ?, 'pending') RETURNING id`,
    [
      row.assignment_id,
      row.household_id,
      row.requested_by,
      row.requested_to,
      row.reason ?? null,
    ],
  );
  return result.insertId;
}

export async function findRequestById(id, conn) {
  const exec = conn?.query ?? query;
  const rows = await exec(
    `SELECT ${COLS} FROM reassignment_requests WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

export async function findPendingForAssignment(assignmentId, conn) {
  const exec = conn?.query ?? query;
  const rows = await exec(
    `SELECT ${COLS} FROM reassignment_requests
      WHERE assignment_id = ? AND status = 'pending'
      LIMIT 1`,
    [assignmentId],
  );
  return rows[0] || null;
}

export async function listRequests(householdId, { status, direction, userId }) {
  const where = ['household_id = ?'];
  const params = [householdId];
  if (status) {
    where.push('status = ?');
    params.push(status);
  }
  if (direction === 'incoming') {
    where.push('requested_to = ?');
    params.push(userId);
  } else if (direction === 'outgoing') {
    where.push('requested_by = ?');
    params.push(userId);
  }
  return query(
    `SELECT ${COLS} FROM reassignment_requests
      WHERE ${where.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT 200`,
    params,
  );
}

export async function setRequestStatus(conn, id, status, rejectionReason = null) {
  const exec = conn?.query ?? query;
  await exec(
    `UPDATE reassignment_requests
        SET status = ?,
            rejection_reason = ?,
            responded_at = NOW()
      WHERE id = ? AND status = 'pending'`,
    [status, rejectionReason, id],
  );
}
