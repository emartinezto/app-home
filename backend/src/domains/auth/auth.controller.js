import * as authService from './auth.service.js';

function ctxFrom(req) {
  return {
    userAgent: (req.headers['user-agent'] || '').slice(0, 255),
    ip: req.ip,
  };
}

export async function signupController(req, res) {
  const out = await authService.signup(req.body, ctxFrom(req));
  res.status(201).json(out);
}

export async function loginController(req, res) {
  const out = await authService.login(req.body, ctxFrom(req));
  res.json(out);
}

export async function refreshController(req, res) {
  const out = await authService.refresh(req.body, ctxFrom(req));
  res.json(out);
}

export async function logoutController(req, res) {
  await authService.logout(req.body);
  res.status(204).end();
}

export async function logoutAllController(req, res) {
  await authService.logoutAll(req.user.id);
  res.status(204).end();
}
