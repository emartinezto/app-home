import { withTransaction } from '../../config/db.js';
import { E } from '../../utils/errors.js';
import {
  listTasks,
  findTaskByIdAndHousehold,
  findTaskByTemplateAndHousehold,
  insertTask,
  updateTask,
  deleteTask,
} from './tasks.repository.js';
import { findTaskTemplateById } from '../task-templates/task-templates.repository.js';

function rowToTask(t) {
  if (!t) return null;
  return { ...t, is_active: Boolean(t.is_active) };
}

export async function listTasksForHousehold(householdId, filters) {
  const rows = await listTasks(householdId, filters);
  return { tasks: rows.map(rowToTask) };
}

export async function createTask(householdId, body) {
  // Si llega template_id, copiar metadatos por defecto del template (si faltan)
  return withTransaction(async (conn) => {
    let payload = { ...body };
    if (payload.template_id) {
      const tpl = await findTaskTemplateById(payload.template_id);
      if (!tpl) throw E.notFound('Template no existe');
      payload.category = payload.category || tpl.category;
      payload.frequency = payload.frequency || tpl.frequency;
      payload.weight = payload.weight || tpl.default_weight;
      payload.time_slot = payload.time_slot || tpl.default_time_slot;

      const existing = await findTaskByTemplateAndHousehold(payload.template_id, householdId, conn);
      if (existing) {
        throw E.conflict('TASK_FROM_TEMPLATE_EXISTS', 'Ya existe una tarea para ese template');
      }
    }
    const id = await insertTask(conn, householdId, payload);
    const task = await findTaskByIdAndHousehold(id, householdId, conn);
    return { task: rowToTask(task) };
  });
}

export async function patchTask(householdId, taskId, patch) {
  return withTransaction(async (conn) => {
    const current = await findTaskByIdAndHousehold(taskId, householdId, conn);
    if (!current) throw E.notFound('Tarea no encontrada');
    await updateTask(conn, taskId, householdId, patch);
    const updated = await findTaskByIdAndHousehold(taskId, householdId, conn);
    return { task: rowToTask(updated) };
  });
}

export async function removeTask(householdId, taskId) {
  const current = await findTaskByIdAndHousehold(taskId, householdId);
  if (!current) throw E.notFound('Tarea no encontrada');
  const ok = await deleteTask(taskId, householdId);
  if (!ok) throw E.notFound('Tarea no encontrada');
}

/**
 * Activa varias tareas a partir de templates: por cada template_id,
 * crea una task is_active=true si no existe, o la actualiza a is_active=true.
 */
export async function bulkActivateFromTemplates(householdId, templateIds) {
  return withTransaction(async (conn) => {
    const created = [];
    const updated = [];
    for (const tid of templateIds) {
      const tpl = await findTaskTemplateById(tid);
      if (!tpl) {
        throw E.notFound(`Template ${tid} no existe`);
      }
      const existing = await findTaskByTemplateAndHousehold(tid, householdId, conn);
      if (existing) {
        if (!existing.is_active) {
          await updateTask(conn, existing.id, householdId, { is_active: true });
        }
        updated.push(existing.id);
      } else {
        const id = await insertTask(conn, householdId, {
          template_id: tid,
          name: tpl.name,
          category: tpl.category,
          frequency: tpl.frequency,
          weight: tpl.default_weight,
          time_slot: tpl.default_time_slot,
          is_active: true,
        });
        created.push(id);
      }
    }
    const allRows = await listTasks(householdId, { active: true }, conn);
    return {
      created_count: created.length,
      updated_count: updated.length,
      tasks: allRows.map(rowToTask),
    };
  });
}
