import * as svc from './reassignments.service.js';

export async function createRequestController(req, res) {
  const out = await svc.createRequest(
    req.user.household_id,
    req.user.id,
    req.params.id, // viene del router padre /assignments/:id
    req.body,
  );
  res.status(201).json(out);
}

export async function listRequestsController(req, res) {
  const out = await svc.listForUser(req.user.household_id, req.user.id, req.query);
  res.json(out);
}

export async function acceptController(req, res) {
  const out = await svc.acceptRequest(req.user.household_id, req.user.id, req.params.id);
  res.json(out);
}

export async function rejectController(req, res) {
  const out = await svc.rejectRequest(
    req.user.household_id,
    req.user.id,
    req.params.id,
    req.body,
  );
  res.json(out);
}

export async function cancelController(req, res) {
  const out = await svc.cancelRequest(req.user.household_id, req.user.id, req.params.id);
  res.json(out);
}
