import { logger } from '../config/logger.js';

export function attachLogger(req, res, next) {
  req.log = logger.child({ req_id: req.id });
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const meta = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration_ms: Number(durationMs.toFixed(2)),
      user_id: req.user?.id,
    };
    if (res.statusCode >= 500) req.log.error(meta, 'request');
    else if (res.statusCode >= 400) req.log.warn(meta, 'request');
    else req.log.info(meta, 'request');
  });

  next();
}
