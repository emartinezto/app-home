import { withTransaction } from '../../config/db.js';
import { E } from '../../utils/errors.js';
import { addDays } from '../../utils/dates.js';
import { generateProposal } from '../../services/algorithm.service.js';
import { sendToUser } from '../../services/push.service.js';
import { emitToHousehold } from '../../sockets/index.js';
import {
  findProposalByHouseholdAndWeek,
  findProposalById,
  setProposalStatus,
  setProposalUserConfirm,
} from './proposals.repository.js';
import {
  listAssignmentsByHouseholdAndWeek,
  listAssignmentsByProposal,
} from './assignments.repository.js';
import {
  findAvailabilityByHouseholdAndWeek,
} from './availability.repository.js';
import { findUsersByHousehold } from '../users/users.repository.js';

function shapeAssignment(a) {
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

function shapeProposal(p) {
  if (!p) return null;
  return {
    id: p.id,
    week_start: p.week_start,
    status: p.status,
    generated_at: p.generated_at,
    user1_id: p.user1_id,
    user2_id: p.user2_id,
    user1_confirmed_at: p.user1_confirmed_at,
    user2_confirmed_at: p.user2_confirmed_at,
    user1_load_score: p.user1_load_score,
    user2_load_score: p.user2_load_score,
    load_delta_pct: p.notes?.load_delta_pct ?? null,
    soft_violations_count: p.notes?.soft_violations_count ?? 0,
    imbalance_warning: p.notes?.imbalance_warning ?? false,
    algorithm_version: p.algorithm_version,
  };
}

export async function generateForWeek(householdId, weekStart) {
  const result = await generateProposal(householdId, weekStart);
  const proposal = await findProposalById(result.proposalId);
  const assignments = await listAssignmentsByProposal(result.proposalId);

  const payload = {
    proposal: shapeProposal(proposal),
    assignments: assignments.map(shapeAssignment),
  };

  emitToHousehold(householdId, 'weekly:proposal-ready', {
    week_start: weekStart,
    proposal_id: proposal.id,
    soft_violations_count: proposal.notes?.soft_violations_count ?? 0,
    imbalance_warning: proposal.notes?.imbalance_warning ?? false,
  });

  // Push a ambos miembros
  const users = await findUsersByHousehold(householdId);
  for (const u of users) {
    await sendToUser(u.id, {
      title: 'Casa García',
      body: 'La propuesta de la semana está lista 🎉',
      url: `/weeks/${weekStart}`,
    });
  }

  return payload;
}

export async function confirmProposal(householdId, weekStart, userId) {
  return withTransaction(async (conn) => {
    const proposal = await findProposalByHouseholdAndWeek(householdId, weekStart, conn);
    if (!proposal) throw E.notFound('No hay propuesta para esa semana');
    if (proposal.status === 'active') {
      return { proposal: shapeProposal(proposal), already_active: true };
    }
    if (proposal.status === 'draft') {
      throw E.unprocessable('PROPOSAL_NOT_READY', 'La propuesta aún no se ha generado');
    }

    let userSlot;
    if (proposal.user1_id === userId) userSlot = 1;
    else if (proposal.user2_id === userId) userSlot = 2;
    else throw E.forbidden('No formas parte de esta propuesta');

    await setProposalUserConfirm(conn, proposal.id, userSlot);

    const fresh = await findProposalByHouseholdAndWeek(householdId, weekStart, conn);
    const bothConfirmed = Boolean(fresh.user1_confirmed_at && fresh.user2_confirmed_at);
    let nextStatus = fresh.status;
    if (bothConfirmed && fresh.status !== 'active') {
      nextStatus = 'active';
      await setProposalStatus(conn, fresh.id, 'active');
    }
    const final = await findProposalByHouseholdAndWeek(householdId, weekStart, conn);

    emitToHousehold(householdId, 'weekly:proposal-confirmed', {
      week_start: weekStart,
      proposal_id: final.id,
      by_user_id: userId,
      status: nextStatus,
    });

    return { proposal: shapeProposal(final), both_confirmed: bothConfirmed };
  });
}

export async function getWeekSummary(householdId, weekStart) {
  const [proposal, availabilityRows, assignments, users] = await Promise.all([
    findProposalByHouseholdAndWeek(householdId, weekStart),
    findAvailabilityByHouseholdAndWeek(householdId, weekStart),
    listAssignmentsByHouseholdAndWeek(householdId, weekStart),
    findUsersByHousehold(householdId),
  ]);

  const availability = {};
  for (const a of availabilityRows) {
    availability[a.user_id] = {
      office_days: a.office_days,
      confirmed: a.confirmed,
      confirmed_at: a.confirmed_at,
    };
  }

  const days = [];
  for (let d = 1; d <= 7; d++) {
    days.push({
      day_of_week: d,
      date: addDays(weekStart, d - 1),
      assignments: assignments
        .filter((x) => x.day_of_week === d)
        .map(shapeAssignment),
    });
  }

  return {
    week_start: weekStart,
    proposal: shapeProposal(proposal),
    availability,
    members: users.map((u) => ({ id: u.id, name: u.name, avatar_color: u.avatar_color })),
    days,
  };
}

export async function listAssignmentsFlat(householdId, weekStart) {
  const rows = await listAssignmentsByHouseholdAndWeek(householdId, weekStart);
  return { assignments: rows.map(shapeAssignment) };
}
