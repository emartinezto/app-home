import { withTransaction } from '../../config/db.js';
import { E } from '../../utils/errors.js';
import { emitToHousehold } from '../../sockets/index.js';
import {
  findAssignmentById,
  insertSingleAssignment,
  markAssignmentDone,
  markAssignmentUndone,
} from './assignments.repository.js';
import { findProposalByHouseholdAndWeek } from './proposals.repository.js';
import { findTaskByIdAndHousehold } from '../tasks/tasks.repository.js';
import { findUsersByHousehold } from '../users/users.repository.js';

function shape(a) {
  return {
    id: a.id,
    task_id: a.task_id,
    task_name: a.task_name,
    task_category: a.task_category,
    assigned_to: a.assigned_to,
    day_of_week: a.day_of_week,
    time_slot: a.task_time_slot,
    weight: a.task_weight,
    is_done: a.is_done,
    done_at: a.done_at,
    done_by: a.done_by,
    soft_violation: a.soft_violation,
  };
}

export async function createManualAssignment(householdId, weekStart, body) {
  return withTransaction(async (conn) => {
    const task = await findTaskByIdAndHousehold(body.task_id, householdId, conn);
    if (!task) throw E.notFound('Tarea no encontrada en este hogar');

    const users = await findUsersByHousehold(householdId, conn);
    if (!users.find((u) => u.id === body.assigned_to)) {
      throw E.forbidden('El usuario asignado no pertenece al hogar');
    }

    let proposal = await findProposalByHouseholdAndWeek(householdId, weekStart, conn);
    if (!proposal) {
      // Permitimos crear asignaciones manuales sin propuesta previa creando un draft
      const result = await conn.query(
        `INSERT INTO weekly_proposals (household_id, week_start, status, user1_id, user2_id, algorithm_version)
         VALUES (?, ?, 'active', ?, ?, 'manual')`,
        [householdId, weekStart, users[0].id, users[1]?.id ?? null],
      );
      proposal = { id: result.insertId, status: 'active' };
    } else if (proposal.status === 'draft') {
      throw E.unprocessable(
        'PROPOSAL_NOT_READY',
        'Genera la propuesta antes de añadir manualmente',
      );
    }

    const id = await insertSingleAssignment(conn, {
      proposal_id: proposal.id,
      household_id: householdId,
      week_start: weekStart,
      task_id: body.task_id,
      assigned_to: body.assigned_to,
      day_of_week: body.day_of_week,
      soft_violation: false,
    });
    const inserted = await findAssignmentById(id, conn);

    emitToHousehold(householdId, 'assignment:created', {
      week_start: weekStart,
      assignment: shape(inserted),
    });

    return { assignment: shape(inserted) };
  });
}

export async function markDone(householdId, assignmentId, userId) {
  const current = await findAssignmentById(assignmentId);
  if (!current || current.household_id !== householdId) {
    throw E.notFound('Asignación no encontrada');
  }
  if (current.is_done) {
    throw E.unprocessable('ALREADY_DONE', 'Esta tarea ya estaba marcada');
  }
  const ok = await markAssignmentDone(assignmentId, householdId, userId);
  if (!ok) throw E.unprocessable('ALREADY_DONE', 'Esta tarea ya estaba marcada');
  const fresh = await findAssignmentById(assignmentId);

  emitToHousehold(householdId, 'task:done', {
    assignment_id: assignmentId,
    week_start: fresh.week_start,
    done_by: userId,
    done_at: fresh.done_at,
  });

  return {
    id: fresh.id,
    is_done: fresh.is_done,
    done_at: fresh.done_at,
    done_by: fresh.done_by,
  };
}

export async function markUndone(householdId, assignmentId) {
  const current = await findAssignmentById(assignmentId);
  if (!current || current.household_id !== householdId) {
    throw E.notFound('Asignación no encontrada');
  }
  if (!current.is_done) {
    throw E.unprocessable('NOT_DONE', 'Esta tarea no estaba marcada');
  }
  const ok = await markAssignmentUndone(assignmentId, householdId);
  if (!ok) throw E.unprocessable('NOT_DONE', 'Esta tarea no estaba marcada');
  const fresh = await findAssignmentById(assignmentId);

  emitToHousehold(householdId, 'task:undone', {
    assignment_id: assignmentId,
    week_start: fresh.week_start,
  });

  return {
    id: fresh.id,
    is_done: fresh.is_done,
    done_at: null,
    done_by: null,
  };
}
