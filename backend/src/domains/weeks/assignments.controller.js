import * as svc from './assignments.service.js';

export async function markDoneController(req, res) {
  const out = await svc.markDone(req.user.household_id, req.params.id, req.user.id);
  res.json(out);
}

export async function markUndoneController(req, res) {
  const out = await svc.markUndone(req.user.household_id, req.params.id);
  res.json(out);
}
