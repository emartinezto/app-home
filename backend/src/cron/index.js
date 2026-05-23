import cron from 'node-cron';
import { config } from '../config/env.js';
import { logger } from '../config/logger.js';
import { currentWeekStart, addDays } from '../utils/dates.js';
import { listActiveHouseholds } from '../domains/households/households.repository.js';
import { findUsersByHousehold } from '../domains/users/users.repository.js';
import { findAvailabilityByHouseholdAndWeek } from '../domains/weeks/availability.repository.js';
import { findProposalByHouseholdAndWeek } from '../domains/weeks/proposals.repository.js';
import { generateForWeek } from '../domains/weeks/proposals.service.js';
import { sendToUser } from '../services/push.service.js';

const tasks = [];

function nextWeekStart() {
  return addDays(currentWeekStart(), 7);
}

async function reminderOfficeDays() {
  const weekStart = nextWeekStart();
  const households = await listActiveHouseholds();
  for (const h of households) {
    try {
      const users = await findUsersByHousehold(h.id);
      if (users.length < 2) continue;
      const avail = await findAvailabilityByHouseholdAndWeek(h.id, weekStart);
      const confirmedIds = new Set(avail.filter((a) => a.confirmed).map((a) => a.user_id));
      for (const u of users) {
        if (confirmedIds.has(u.id)) continue;
        await sendToUser(u.id, {
          title: 'Casa García',
          body: 'Mete tus días de oficina para la próxima semana 🗓️',
          url: `/weeks/${weekStart}/availability`,
        });
      }
    } catch (err) {
      logger.error({ err, household_id: h.id }, 'cron: reminderOfficeDays falló');
    }
  }
}

async function autoGenerateProposals() {
  const weekStart = nextWeekStart();
  const households = await listActiveHouseholds();
  for (const h of households) {
    try {
      const users = await findUsersByHousehold(h.id);
      if (users.length < 2) continue;
      const avail = await findAvailabilityByHouseholdAndWeek(h.id, weekStart);
      if (avail.length < 2 || avail.some((a) => !a.confirmed)) continue;
      const existing = await findProposalByHouseholdAndWeek(h.id, weekStart);
      if (existing && (existing.status === 'pending_confirmation' || existing.status === 'active')) {
        continue;
      }
      await generateForWeek(h.id, weekStart);
      logger.info({ household_id: h.id, week_start: weekStart }, 'cron: propuesta auto-generada');
    } catch (err) {
      logger.error({ err, household_id: h.id }, 'cron: autoGenerateProposals falló');
    }
  }
}

async function reminderProposalConfirmation() {
  const weekStart = currentWeekStart();
  const households = await listActiveHouseholds();
  for (const h of households) {
    try {
      const proposal = await findProposalByHouseholdAndWeek(h.id, weekStart);
      if (!proposal) continue;
      if (proposal.status !== 'pending_confirmation') continue;
      const users = await findUsersByHousehold(h.id);
      for (const u of users) {
        const confirmed =
          (proposal.user1_id === u.id && proposal.user1_confirmed_at) ||
          (proposal.user2_id === u.id && proposal.user2_confirmed_at);
        if (confirmed) continue;
        await sendToUser(u.id, {
          title: 'Casa García',
          body: 'Confirma la propuesta de la semana 👀',
          url: `/weeks/${weekStart}`,
        });
      }
    } catch (err) {
      logger.error({ err, household_id: h.id }, 'cron: reminderProposalConfirmation falló');
    }
  }
}

export function startCronJobs() {
  const tz = config.cron.timezone;

  tasks.push(
    cron.schedule(
      '0 21 * * 0',
      () => {
        logger.info('⏰ cron: reminderOfficeDays (Dom 21:00)');
        reminderOfficeDays();
      },
      { timezone: tz },
    ),
  );

  tasks.push(
    cron.schedule(
      '30 22 * * 0',
      () => {
        logger.info('⏰ cron: autoGenerateProposals (Dom 22:30)');
        autoGenerateProposals();
      },
      { timezone: tz },
    ),
  );

  tasks.push(
    cron.schedule(
      '0 9 * * 1',
      () => {
        logger.info('⏰ cron: reminderProposalConfirmation (Lun 09:00)');
        reminderProposalConfirmation();
      },
      { timezone: tz },
    ),
  );
}

export function stopCronJobs() {
  for (const t of tasks) {
    try {
      t.stop();
    } catch {
      // ignore
    }
  }
  tasks.length = 0;
}
