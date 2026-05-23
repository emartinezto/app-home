import { z } from 'zod';

export const updateSettingsSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    timezone: z.string().trim().min(1).max(64).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Nada que actualizar' });
