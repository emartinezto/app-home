import { E } from '../../utils/errors.js';
import {
  findHouseholdById,
  updateHouseholdSettings,
} from '../households/households.repository.js';

function shape(h) {
  return {
    id: h.id,
    name: h.name,
    timezone: h.timezone,
    invite_code: h.invite_code,
    invite_code_expires_at: h.invite_code_expires_at,
    archived_at: h.archived_at,
  };
}

export async function getSettings(householdId) {
  const h = await findHouseholdById(householdId);
  if (!h) throw E.notFound('Hogar no encontrado');
  return { settings: shape(h) };
}

export async function patchSettings(householdId, body) {
  await updateHouseholdSettings(householdId, body);
  const h = await findHouseholdById(householdId);
  return { settings: shape(h) };
}
