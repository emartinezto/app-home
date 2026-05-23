import * as svc from './households.service.js';

export async function createHouseholdController(req, res) {
  const out = await svc.createHouseholdForUser(req.user.id, req.body);
  res.status(201).json(out);
}

export async function joinHouseholdController(req, res) {
  const out = await svc.joinHousehold(req.user.id, req.body);
  res.json(out);
}

export async function getMyHouseholdController(req, res) {
  const out = await svc.getMyHousehold(req.user.household_id);
  res.json(out);
}

export async function regenerateInviteCodeController(req, res) {
  const out = await svc.regenerateInviteCode(req.user.household_id);
  res.json(out);
}
