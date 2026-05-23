import * as svc from './tasks.service.js';

export async function listTasksController(req, res) {
  const out = await svc.listTasksForHousehold(req.user.household_id, req.query);
  res.json(out);
}

export async function createTaskController(req, res) {
  const out = await svc.createTask(req.user.household_id, req.body);
  res.status(201).json(out);
}

export async function patchTaskController(req, res) {
  const out = await svc.patchTask(req.user.household_id, req.params.id, req.body);
  res.json(out);
}

export async function deleteTaskController(req, res) {
  await svc.removeTask(req.user.household_id, req.params.id);
  res.status(204).end();
}

export async function bulkActivateController(req, res) {
  const out = await svc.bulkActivateFromTemplates(
    req.user.household_id,
    req.body.template_ids,
  );
  res.status(201).json(out);
}
