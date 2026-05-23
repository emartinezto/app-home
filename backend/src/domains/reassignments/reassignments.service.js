import { withTransaction } from '../../config/db.js';
import { E } from '../../utils/errors.js';
import { emitToHousehold } from '../../sockets/index.js';
import { sendToUser } from '../../services/push.service.js';
import {
  insertRequest,
  findRequestById,
  findPendingForAssignment,
  listRequests,
  setRequestStatus,
} from './reassignments.repository.js';
import {
  findAssignmentById,
  reassignAssignment,
} from '../weeks/assignments.repository.js';
import { findUsersByHousehold } from '../users/users.repository.js';

function shape(r) {
  return {
    id: r.id,
    assignment_id: r.assignment_id,
    requested_by: r.requested_by,
    requested_to: r.requested_to,
    reason: r.reason,
    status: r.status,
    rejection_reason: r.rejection_reason,
    responded_at: r.responded_at,
    created_at: r.created_at,
  };
}

export async function createRequest(householdId, userId, assignmentId, body) {
  return withTransaction(async (conn) => {
    const assignment = await findAssignmentById(assignmentId, conn);
    if (!assignment || assignment.household_id !== householdId) {
      throw E.notFound('Asignación no encontrada');
    }
    if (assignment.assigned_to !== userId) {
      throw E.forbidden('Solo puedes pedir reasignación de tareas que tienes asignadas');
    }
    if (assignment.is_done) {
      throw E.unprocessable(
        'ASSIGNMENT_ALREADY_DONE',
        'No puedes pedir reasignación de una tarea ya hecha',
      );
    }

    const pending = await findPendingForAssignment(assignmentId, conn);
    if (pending) {
      throw E.conflict(
        'REASSIGNMENT_ALREADY_PENDING',
        'Ya hay una petición de reasignación en curso para esta tarea',
      );
    }

    const users = await findUsersByHousehold(householdId, conn);
    const otherUser = users.find((u) => u.id !== userId);
    if (!otherUser) throw E.unprocessable('HOUSEHOLD_INCOMPLETE', 'No hay otro miembro');

    const id = await insertRequest(conn, {
      assignment_id: assignmentId,
      household_id: householdId,
      requested_by: userId,
      requested_to: otherUser.id,
      reason: body.reason ?? null,
    });
    const created = await findRequestById(id, conn);

    emitToHousehold(householdId, 'reassignment:requested', {
      request_id: id,
      assignment_id: assignmentId,
      requested_by: userId,
      requested_to: otherUser.id,
    });
    await sendToUser(otherUser.id, {
      title: 'Petición de reasignación',
      body: `Tu pareja te pide cambiar una tarea${body.reason ? ': ' + body.reason : ''}`,
      url: `/reassignments`,
    });

    return { request: shape(created) };
  });
}

export async function listForUser(householdId, userId, query) {
  const rows = await listRequests(householdId, { ...query, userId });
  return { requests: rows.map(shape) };
}

export async function acceptRequest(householdId, userId, requestId) {
  return withTransaction(async (conn) => {
    const req = await findRequestById(requestId, conn);
    if (!req || req.household_id !== householdId) throw E.notFound('Petición no encontrada');
    if (req.status !== 'pending') {
      throw E.unprocessable('REQUEST_NOT_PENDING', `La petición está ${req.status}`);
    }
    if (req.requested_to !== userId) {
      throw E.forbidden('Solo el destinatario puede aceptar esta petición');
    }

    const assignment = await findAssignmentById(req.assignment_id, conn);
    if (!assignment) throw E.notFound('Asignación no existe');
    if (assignment.is_done) {
      throw E.unprocessable(
        'ASSIGNMENT_ALREADY_DONE',
        'La tarea ya se hizo; no se puede reasignar',
      );
    }

    await reassignAssignment(conn, req.assignment_id, userId);
    await setRequestStatus(conn, requestId, 'accepted');

    const updated = await findRequestById(requestId, conn);
    const updatedAssignment = await findAssignmentById(req.assignment_id, conn);

    emitToHousehold(householdId, 'reassignment:accepted', {
      request_id: requestId,
      assignment_id: req.assignment_id,
      new_assigned_to: userId,
    });
    await sendToUser(req.requested_by, {
      title: 'Reasignación aceptada',
      body: 'Tu pareja ha aceptado el cambio de tarea ✅',
      url: `/weeks/${updatedAssignment.week_start}`,
    });

    return { request: shape(updated) };
  });
}

export async function rejectRequest(householdId, userId, requestId, body) {
  return withTransaction(async (conn) => {
    const req = await findRequestById(requestId, conn);
    if (!req || req.household_id !== householdId) throw E.notFound('Petición no encontrada');
    if (req.status !== 'pending') {
      throw E.unprocessable('REQUEST_NOT_PENDING', `La petición está ${req.status}`);
    }
    if (req.requested_to !== userId) {
      throw E.forbidden('Solo el destinatario puede rechazar esta petición');
    }

    await setRequestStatus(conn, requestId, 'rejected', body.rejection_reason ?? null);
    const updated = await findRequestById(requestId, conn);

    emitToHousehold(householdId, 'reassignment:rejected', {
      request_id: requestId,
      assignment_id: req.assignment_id,
    });
    await sendToUser(req.requested_by, {
      title: 'Reasignación rechazada',
      body: body.rejection_reason || 'Tu pareja no puede hacerse cargo esta vez.',
      url: `/reassignments`,
    });

    return { request: shape(updated) };
  });
}

export async function cancelRequest(householdId, userId, requestId) {
  return withTransaction(async (conn) => {
    const req = await findRequestById(requestId, conn);
    if (!req || req.household_id !== householdId) throw E.notFound('Petición no encontrada');
    if (req.status !== 'pending') {
      throw E.unprocessable('REQUEST_NOT_PENDING', `La petición está ${req.status}`);
    }
    if (req.requested_by !== userId) {
      throw E.forbidden('Solo quien creó la petición puede cancelarla');
    }

    await setRequestStatus(conn, requestId, 'cancelled');
    const updated = await findRequestById(requestId, conn);

    emitToHousehold(householdId, 'reassignment:cancelled', {
      request_id: requestId,
      assignment_id: req.assignment_id,
    });

    return { request: shape(updated) };
  });
}
