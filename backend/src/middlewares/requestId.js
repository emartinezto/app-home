import crypto from 'node:crypto';

export function requestId(req, res, next) {
  const incoming = req.headers['x-request-id'];
  const id = typeof incoming === 'string' && incoming.length <= 64 ? incoming : crypto.randomUUID();
  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
}
