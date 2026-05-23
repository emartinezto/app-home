import { z } from 'zod';

const category = z.enum(['hogar', 'cuidados', 'perro']);
const frequency = z.enum(['diaria', 'semanal', 'quincenal', 'mensual', 'puntual']);
const timeSlot = z.enum(['manana', 'tarde', 'flexible']);
const weight = z.coerce.number().int().min(1).max(3);

export const createTaskSchema = z.object({
  template_id: z.coerce.number().int().positive().optional().nullable(),
  name: z.string().trim().min(1).max(150),
  category,
  frequency,
  weight,
  time_slot: timeSlot.default('flexible'),
  is_active: z.boolean().optional().default(true),
});

export const updateTaskSchema = z
  .object({
    name: z.string().trim().min(1).max(150).optional(),
    category: category.optional(),
    frequency: frequency.optional(),
    weight: weight.optional(),
    time_slot: timeSlot.optional(),
    is_active: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Nada que actualizar' });

export const taskIdParam = z.object({
  id: z.coerce.number().int().positive(),
});

export const bulkActivateSchema = z.object({
  template_ids: z.array(z.coerce.number().int().positive()).min(1).max(100),
});

export const tasksQuerySchema = z.object({
  active: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  category: category.optional(),
});
