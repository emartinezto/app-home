import { query } from '../../config/db.js';

const TASK_COLS = `
  id, household_id, template_id, name, category, frequency, weight,
  time_slot, is_active, created_at, updated_at
`;

export async function listTasks(householdId, filters = {}, conn) {
  const exec = conn?.query ?? query;
  const where = ['household_id = ?'];
  const params = [householdId];
  if (filters.active !== undefined) {
    where.push('is_active = ?');
    params.push(!!filters.active);
  }
  if (filters.category) {
    where.push('category = ?');
    params.push(filters.category);
  }
  return exec(
    `SELECT ${TASK_COLS} FROM tasks WHERE ${where.join(' AND ')} ORDER BY category, name`,
    params,
  );
}

export async function listActiveTasksForAlgorithm(conn, householdId) {
  const exec = conn?.query ?? query;
  return exec(
    `SELECT ${TASK_COLS} FROM tasks WHERE household_id = ? AND is_active = TRUE ORDER BY weight DESC, id ASC`,
    [householdId],
  );
}

export async function findTaskByIdAndHousehold(id, householdId, conn) {
  const exec = conn?.query ?? query;
  const rows = await exec(
    `SELECT ${TASK_COLS} FROM tasks WHERE id = ? AND household_id = ? LIMIT 1`,
    [id, householdId],
  );
  return rows[0] || null;
}

export async function findTaskByTemplateAndHousehold(templateId, householdId, conn) {
  const exec = conn?.query ?? query;
  const rows = await exec(
    `SELECT ${TASK_COLS} FROM tasks WHERE template_id = ? AND household_id = ? LIMIT 1`,
    [templateId, householdId],
  );
  return rows[0] || null;
}

export async function insertTask(conn, householdId, data) {
  const exec = conn?.query ?? query;
  const result = await exec(
    `INSERT INTO tasks
       (household_id, template_id, name, category, frequency, weight, time_slot, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    [
      householdId,
      data.template_id ?? null,
      data.name,
      data.category,
      data.frequency,
      data.weight,
      data.time_slot ?? 'flexible',
      !!data.is_active,
    ],
  );
  return result.insertId;
}

export async function updateTask(conn, id, householdId, patch) {
  const exec = conn?.query ?? query;
  const fields = [];
  const params = [];
  for (const k of ['name', 'category', 'frequency', 'weight', 'time_slot']) {
    if (patch[k] !== undefined) {
      fields.push(`${k} = ?`);
      params.push(patch[k]);
    }
  }
  if (patch.is_active !== undefined) {
    fields.push('is_active = ?');
    params.push(!!patch.is_active);
  }
  if (fields.length === 0) return;
  params.push(id, householdId);
  await exec(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ? AND household_id = ?`, params);
}

export async function deleteTask(id, householdId) {
  const result = await query(`DELETE FROM tasks WHERE id = ? AND household_id = ?`, [
    id,
    householdId,
  ]);
  return result.affectedRows > 0;
}
