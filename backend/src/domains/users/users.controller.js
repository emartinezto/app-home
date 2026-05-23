import * as svc from './users.service.js';

export async function getMeController(req, res) {
  const out = await svc.getMe(req.user.id);
  res.json(out);
}

export async function patchMeController(req, res) {
  const out = await svc.patchMe(req.user.id, req.body);
  res.json(out);
}

export async function setWorkScheduleController(req, res) {
  const out = await svc.setWorkSchedule(req.user.id, req.body);
  res.json(out);
}

export async function addPushSubscriptionController(req, res) {
  const ua = (req.headers['user-agent'] || '').slice(0, 255);
  const out = await svc.addPushSubscription(req.user.id, req.body, ua);
  res.status(201).json(out);
}

export async function listPushSubscriptionsController(req, res) {
  const out = await svc.listPushSubscriptions(req.user.id);
  res.json(out);
}

export async function removePushSubscriptionController(req, res) {
  await svc.removePushSubscription(req.user.id, req.params.id);
  res.status(204).end();
}

export async function deleteMeController(req, res) {
  await svc.deleteMyAccount(req.user.id);
  res.status(204).end();
}
