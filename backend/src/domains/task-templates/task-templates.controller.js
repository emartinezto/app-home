import { listTaskTemplates } from './task-templates.repository.js';

export async function listTaskTemplatesController(_req, res) {
  const templates = await listTaskTemplates();
  res.json({ templates });
}
