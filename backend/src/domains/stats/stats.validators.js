import { z } from 'zod';

export const loadQuerySchema = z.object({
  weeks: z.coerce.number().int().min(1).max(52).default(4),
});
