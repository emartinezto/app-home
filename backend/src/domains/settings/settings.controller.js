import * as svc from './settings.service.js';

export async function getSettingsController(req, res) {
  const out = await svc.getSettings(req.user.household_id);
  res.json(out);
}

export async function patchSettingsController(req, res) {
  const out = await svc.patchSettings(req.user.household_id, req.body);
  res.json(out);
}
