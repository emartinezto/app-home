import { query } from '../../config/db.js';

export async function listTaskTemplates() {
  return query(
    `SELECT id, name, category, frequency, default_weight, default_time_slot, display_order
       FROM task_templates
       ORDER BY display_order ASC, id ASC`,
  );
}

export async function findTaskTemplateById(id) {
  const rows = await query(
    `SELECT id, name, category, frequency, default_weight, default_time_slot, display_order
       FROM task_templates
      WHERE id = ?
      LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}
