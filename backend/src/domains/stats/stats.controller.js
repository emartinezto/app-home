import { getLoadStats } from './stats.service.js';

export async function loadStatsController(req, res) {
  const out = await getLoadStats(req.user.household_id, req.query.weeks);
  res.json(out);
}
