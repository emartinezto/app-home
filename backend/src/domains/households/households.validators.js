import { z } from 'zod';

export const createHouseholdSchema = z.object({
  name: z.string().trim().min(1, 'Nombre obligatorio').max(100),
  timezone: z.string().trim().min(1).max(64).optional(),
});

export const joinHouseholdSchema = z.object({
  invite_code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{6}$/, 'Código de invitación inválido (6 caracteres alfanuméricos)'),
});
