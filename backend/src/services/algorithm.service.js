import { withTransaction } from '../config/db.js';
import { E } from '../utils/errors.js';
import { logger } from '../config/logger.js';
import { dowToToken, subtractWeeks } from '../utils/dates.js';
import { findUsersByHousehold } from '../domains/users/users.repository.js';
import { listActiveTasksForAlgorithm } from '../domains/tasks/tasks.repository.js';
import {
  findAvailabilityByHouseholdAndWeek,
} from '../domains/weeks/availability.repository.js';
import {
  findProposalByHouseholdAndWeek,
  insertProposal,
  updateProposalGenerated,
  deleteProposal,
} from '../domains/weeks/proposals.repository.js';
import {
  bulkInsertAssignments,
  deleteAssignmentsByProposal,
  listAssignmentsForLoadHistory,
} from '../domains/weeks/assignments.repository.js';

const HISTORY_WEEKS = 4;
const CARRY_OVER_FACTOR = 0.3;
const TARGET_DELTA_PCT = 0.10;
const MAX_SWAP_ITERATIONS = 50;
const KOLE_TASK_NAME_NORMALIZED = 'llevar al cole';

/* ===========================================================================
 * 1. INSTANCIACIÓN: convertir cada tarea en N instancias semanales según
 *    su frecuencia.
 *      diaria     → 7 instancias (días 1..7)
 *      semanal    → 1 instancia
 *      quincenal  → 1 instancia (alternancia ISO-week pares/impares)
 *      mensual    → 1 instancia (solo si la semana contiene día 1..7 de mes)
 *      puntual    → 0 instancias (se asignan a mano vía endpoint)
 * Para diarias el día queda fijado; para el resto, day=null y se elige luego.
 * ======================================================================== */
function isoWeekNumber(weekStart) {
  // weekStart es lunes UTC. Cálculo ISO-8601 estándar.
  const d = new Date(`${weekStart}T00:00:00Z`);
  const target = new Date(d.valueOf());
  const dayNr = (d.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target) / 604800000);
}

function instantiateTasks(tasks, weekStart) {
  const instances = [];
  let counter = 0;
  for (const task of tasks) {
    switch (task.frequency) {
      case 'diaria': {
        for (let d = 1; d <= 7; d++) {
          instances.push({
            seq: counter++,
            task,
            day: d,
            forbidden: [],
            assigned_to: null,
            soft_violation: false,
          });
        }
        break;
      }
      case 'semanal': {
        instances.push({
          seq: counter++,
          task,
          day: null,
          forbidden: [],
          assigned_to: null,
          soft_violation: false,
        });
        break;
      }
      case 'quincenal': {
        // Alterna por paridad de número de semana ISO
        const wn = isoWeekNumber(weekStart);
        if (wn % 2 === 0) {
          instances.push({
            seq: counter++,
            task,
            day: null,
            forbidden: [],
            assigned_to: null,
            soft_violation: false,
          });
        }
        break;
      }
      case 'mensual': {
        // La instancia mensual se asigna en la primera semana del mes
        // cuya fecha contenga el día 1..7
        const lunes = new Date(`${weekStart}T00:00:00Z`);
        let contieneInicioDeMes = false;
        for (let d = 0; d < 7; d++) {
          const day = new Date(lunes);
          day.setUTCDate(day.getUTCDate() + d);
          if (day.getUTCDate() <= 7) {
            contieneInicioDeMes = true;
            break;
          }
        }
        if (contieneInicioDeMes) {
          instances.push({
            seq: counter++,
            task,
            day: null,
            forbidden: [],
            assigned_to: null,
            soft_violation: false,
          });
        }
        break;
      }
      case 'puntual':
      default:
        // No se autogeneran
        break;
    }
  }
  return instances;
}

/* ===========================================================================
 * 2. RESTRICCIONES DURAS: para una (tarea, día) calcula qué usuarios NO pueden
 *    realizarla. Reglas implementadas:
 *
 *    a) time_slot='manana' y un usuario tiene location='office' empezando
 *       antes de las 09:00 → forbidden.
 *    b) Tarea "Llevar al cole" un día laborable (lun-vie) y un usuario está
 *       en oficina → forbidden.
 *    c) time_slot='tarde' y el usuario sale de oficina después de las 19:30
 *       → forbidden.
 * ======================================================================== */
function timeToMinutes(t) {
  if (!t || !/^\d{2}:\d{2}$/.test(t)) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function userIsAtOfficeOnDay(user, dayToken) {
  const sched = user.work_schedule || {};
  const day = sched[dayToken];
  return Boolean(day && day.location === 'office');
}

function userOfficeWindow(user, dayToken) {
  const sched = user.work_schedule || {};
  const day = sched[dayToken];
  if (!day || day.location !== 'office') return null;
  return {
    start: timeToMinutes(day.start),
    end: timeToMinutes(day.end),
  };
}

function isWeekday(dow) {
  return dow >= 1 && dow <= 5;
}

function normalizeName(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function computeForbidden(task, dow, users, availabilityByUser) {
  const forbidden = [];
  const dayToken = dowToToken(dow);
  const isKole = normalizeName(task.name) === KOLE_TASK_NAME_NORMALIZED;

  for (const u of users) {
    // Disponibilidad declarada para esta semana: si dijeron "office" en este día,
    // tiene prioridad sobre el horario base
    const officeDays = availabilityByUser.get(u.id)?.office_days || [];
    const declaredOffice = officeDays.includes(dayToken);
    const baselineOffice = userIsAtOfficeOnDay(u, dayToken);
    const inOffice = declaredOffice || baselineOffice;
    const window = userOfficeWindow(u, dayToken);

    if (isKole && isWeekday(dow) && inOffice) {
      forbidden.push(u.id);
      continue;
    }

    if (task.time_slot === 'manana' && inOffice && window?.start !== null && window?.start <= 9 * 60) {
      forbidden.push(u.id);
      continue;
    }

    if (task.time_slot === 'tarde' && inOffice && window?.end !== null && window?.end >= 19 * 60 + 30) {
      forbidden.push(u.id);
      continue;
    }
  }
  return forbidden;
}

/* ===========================================================================
 * 3. CARRY-OVER: carga histórica ponderada de las últimas N semanas
 * ======================================================================== */
async function computeHistoricalLoad(householdId, weekStart) {
  const fromW = subtractWeeks(weekStart, HISTORY_WEEKS);
  const rows = await listAssignmentsForLoadHistory(householdId, fromW, weekStart);
  const totals = new Map();
  for (const r of rows) {
    totals.set(r.assigned_to, (totals.get(r.assigned_to) || 0) + Number(r.weight));
  }
  return totals;
}

/* ===========================================================================
 * 4. PREVIOS DE 'Llevar al cole': cuántas veces hizo cada usuario esa tarea
 *    en las últimas N semanas, agregado.
 * ======================================================================== */
async function computeKolePrev(householdId, weekStart) {
  const fromW = subtractWeeks(weekStart, HISTORY_WEEKS);
  const rows = await listAssignmentsForLoadHistory(householdId, fromW, weekStart);
  const counts = new Map();
  for (const r of rows) {
    if (normalizeName(r.task_name) !== KOLE_TASK_NAME_NORMALIZED) continue;
    counts.set(r.assigned_to, (counts.get(r.assigned_to) || 0) + 1);
  }
  return counts;
}

/* ===========================================================================
 * 5. ELECCIÓN DE DÍA para instancias sin día asignado
 * ======================================================================== */
function chooseDayForInstance(instance, users, availabilityByUser, currentLoad) {
  const baseDays = [1, 2, 3, 4, 5, 6, 7];
  const candidateDays =
    instance.task.weight === 3 && instance.task.time_slot === 'flexible'
      ? [6, 7, 1, 2, 3, 4, 5]
      : baseDays;

  let bestDay = null;
  let bestScore = Infinity;
  let bestForbidden = [];

  for (const d of candidateDays) {
    const forbidden = computeForbidden(instance.task, d, users, availabilityByUser);
    const validUsers = users.map((u) => u.id).filter((id) => !forbidden.includes(id));
    if (validUsers.length === 0) continue;

    // Score = desbalance simulado si asignáramos al usuario válido con menos carga
    const minLoadUserId = validUsers.reduce((acc, id) =>
      (currentLoad.get(id) || 0) < (currentLoad.get(acc) || 0) ? id : acc,
    validUsers[0]);
    const simulated = new Map(currentLoad);
    simulated.set(minLoadUserId, (simulated.get(minLoadUserId) || 0) + instance.task.weight);
    const values = users.map((u) => simulated.get(u.id) || 0);
    const score = Math.abs(values[0] - values[1]);

    if (score < bestScore) {
      bestScore = score;
      bestDay = d;
      bestForbidden = forbidden;
    }
  }

  if (bestDay === null) {
    // Fallback: lunes con soft_violation
    instance.day = 1;
    instance.forbidden = [];
    instance.soft_violation = true;
  } else {
    instance.day = bestDay;
    instance.forbidden = bestForbidden;
  }
}

/* ===========================================================================
 * 6. ELECCIÓN DE USUARIO para una instancia (greedy + tie-break)
 * ======================================================================== */
function chooseUserForInstance(instance, users, load, kolePrev, instanceIndexInOrder) {
  let candidates = users.map((u) => u.id).filter((id) => !instance.forbidden.includes(id));

  if (candidates.length === 0) {
    candidates = users.map((u) => u.id);
    instance.soft_violation = true;
  }

  let chosen;
  if (candidates.length === 1) {
    chosen = candidates[0];
  } else {
    const [u1, u2] = users;
    const l1 = load.get(u1.id) || 0;
    const l2 = load.get(u2.id) || 0;
    if (l1 < l2) chosen = u1.id;
    else if (l2 < l1) chosen = u2.id;
    else {
      // Empate exacto
      if (normalizeName(instance.task.name) === KOLE_TASK_NAME_NORMALIZED) {
        const k1 = kolePrev.get(u1.id) || 0;
        const k2 = kolePrev.get(u2.id) || 0;
        chosen = k1 <= k2 ? u1.id : u2.id;
      } else {
        chosen = instanceIndexInOrder % 2 === 0 ? u1.id : u2.id;
      }
    }
  }

  instance.assigned_to = chosen;
  load.set(chosen, (load.get(chosen) || 0) + instance.task.weight);
}

/* ===========================================================================
 * 7. SWAP LOCAL para mejorar balance
 * ======================================================================== */
function tryLocalSwaps(instances, users, load) {
  const [u1, u2] = users;
  let l1 = load.get(u1.id) || 0;
  let l2 = load.get(u2.id) || 0;
  let deltaAbs = Math.abs(l1 - l2);
  let deltaPct = deltaAbs / Math.max(l1, l2, 1);

  if (deltaPct <= TARGET_DELTA_PCT) return;

  let improved = true;
  let iterations = 0;
  while (improved && iterations < MAX_SWAP_ITERATIONS) {
    improved = false;
    iterations += 1;
    for (const i of instances) {
      const otherId = i.assigned_to === u1.id ? u2.id : u1.id;
      if (i.forbidden.includes(otherId)) continue;
      const w = i.task.weight;
      const newL1 = i.assigned_to === u1.id ? l1 - w : l1 + w;
      const newL2 = i.assigned_to === u2.id ? l2 - w : l2 + w;
      const newDelta = Math.abs(newL1 - newL2);
      if (newDelta < deltaAbs) {
        i.assigned_to = otherId;
        l1 = newL1;
        l2 = newL2;
        deltaAbs = newDelta;
        improved = true;
        if (deltaAbs / Math.max(l1, l2, 1) <= TARGET_DELTA_PCT) {
          load.set(u1.id, l1);
          load.set(u2.id, l2);
          return;
        }
      }
    }
  }

  load.set(u1.id, l1);
  load.set(u2.id, l2);
}

/* ===========================================================================
 * 8. ENTRADA PÚBLICA
 * ======================================================================== */
export async function generateProposal(householdId, weekStart) {
  // Pre-validaciones fuera de transacción para fallar rápido
  const users = await findUsersByHousehold(householdId);
  if (users.length < 2) {
    throw E.unprocessable('HOUSEHOLD_INCOMPLETE', 'El hogar necesita 2 miembros');
  }

  const availability = await findAvailabilityByHouseholdAndWeek(householdId, weekStart);
  if (availability.length < 2 || availability.some((a) => !a.confirmed)) {
    throw E.unprocessable(
      'AVAILABILITY_NOT_CONFIRMED',
      'Ambos miembros deben confirmar su disponibilidad',
    );
  }

  const existing = await findProposalByHouseholdAndWeek(householdId, weekStart);
  if (existing && (existing.status === 'pending_confirmation' || existing.status === 'active')) {
    throw E.conflict(
      'PROPOSAL_ALREADY_ACTIVE',
      `Ya existe una propuesta en estado ${existing.status} para esa semana`,
    );
  }

  const availabilityByUser = new Map(availability.map((a) => [a.user_id, a]));
  const histLoad = await computeHistoricalLoad(householdId, weekStart);
  const kolePrev = await computeKolePrev(householdId, weekStart);

  return withTransaction(async (conn) => {
    const tasks = await listActiveTasksForAlgorithm(conn, householdId);
    if (tasks.length === 0) {
      throw E.unprocessable('NO_ACTIVE_TASKS', 'No hay tareas activas para repartir');
    }

    // 1. Instanciar
    const instances = instantiateTasks(tasks, weekStart);
    if (instances.length === 0) {
      throw E.unprocessable('NO_INSTANCES', 'No hay instancias que asignar esta semana');
    }

    // 2. Carga inicial = 30% del histórico
    const load = new Map();
    for (const u of users) {
      load.set(u.id, (histLoad.get(u.id) || 0) * CARRY_OVER_FACTOR);
    }

    // 3. Para diarias ya tienen día → calcular forbidden ahora
    for (const i of instances) {
      if (i.day !== null) {
        i.forbidden = computeForbidden(i.task, i.day, users, availabilityByUser);
      }
    }

    // 4. Elegir día para las que aún no lo tienen (orden weight DESC)
    const sinDia = instances.filter((i) => i.day === null);
    sinDia.sort((a, b) => b.task.weight - a.task.weight);
    for (const i of sinDia) {
      chooseDayForInstance(i, users, availabilityByUser, load);
    }

    // 5. Orden global: weight DESC, manana primero, luego día ASC
    instances.sort((a, b) => {
      if (b.task.weight !== a.task.weight) return b.task.weight - a.task.weight;
      const aMan = a.task.time_slot === 'manana' ? 0 : 1;
      const bMan = b.task.time_slot === 'manana' ? 0 : 1;
      if (aMan !== bMan) return aMan - bMan;
      return a.day - b.day;
    });

    // 6. Asignar usuario greedy
    instances.forEach((i, idx) => chooseUserForInstance(i, users, load, kolePrev, idx));

    // 7. Swap local si delta > 10%
    tryLocalSwaps(instances, users, load);

    // 8. Calcular notas y persistir
    const [u1, u2] = users;
    const finalL1 = load.get(u1.id) || 0;
    const finalL2 = load.get(u2.id) || 0;
    const deltaAbs = Math.abs(finalL1 - finalL2);
    const deltaPct = deltaAbs / Math.max(finalL1, finalL2, 1);
    const softViolations = instances.filter((i) => i.soft_violation).length;
    const notes = {
      soft_violations_count: softViolations,
      imbalance_warning: deltaPct > TARGET_DELTA_PCT,
      load_delta_pct: Number((deltaPct * 100).toFixed(2)),
      algorithm: 'v1',
      history_weeks: HISTORY_WEEKS,
    };

    // Reuse de la fila draft si existe
    let proposalId;
    if (existing && existing.status === 'draft') {
      proposalId = existing.id;
      await deleteAssignmentsByProposal(conn, proposalId);
    } else if (existing && existing.status === 'confirmed') {
      // Caso raro: confirmada pero ya pasó. Borramos y rehacemos
      await deleteProposal(conn, existing.id);
      proposalId = await insertProposal(conn, {
        householdId,
        weekStart,
        user1Id: u1.id,
        user2Id: u2.id,
      });
    } else {
      proposalId = await insertProposal(conn, {
        householdId,
        weekStart,
        user1Id: u1.id,
        user2Id: u2.id,
      });
    }

    await updateProposalGenerated(conn, proposalId, {
      user1Load: Number(finalL1.toFixed(2)),
      user2Load: Number(finalL2.toFixed(2)),
      notes,
      status: 'pending_confirmation',
    });

    const rows = instances.map((i) => ({
      proposal_id: proposalId,
      household_id: householdId,
      week_start: weekStart,
      task_id: i.task.id,
      assigned_to: i.assigned_to,
      day_of_week: i.day,
      soft_violation: i.soft_violation,
    }));
    await bulkInsertAssignments(conn, rows);

    logger.info(
      {
        household_id: householdId,
        week_start: weekStart,
        proposal_id: proposalId,
        instances: instances.length,
        user1_load: finalL1,
        user2_load: finalL2,
        delta_pct: notes.load_delta_pct,
        soft_violations: softViolations,
      },
      'algoritmo: propuesta generada',
    );

    return {
      proposalId,
      finalLoadU1: finalL1,
      finalLoadU2: finalL2,
      deltaPct: notes.load_delta_pct,
      softViolations,
      imbalanceWarning: notes.imbalance_warning,
      instancesCount: instances.length,
    };
  });
}
