import { z } from 'zod';
import { tokenToDow } from '../../utils/dates.js';

export const weekParamSchema = z.object({
  weekStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD requerido')
    .refine((s) => {
      const d = new Date(`${s}T00:00:00Z`);
      return !Number.isNaN(d.getTime()) && d.getUTCDay() === 1;
    }, 'week_start debe caer en lunes (UTC)'),
});

const dayToken = z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);

export const setAvailabilitySchema = z.object({
  office_days: z.array(dayToken).max(7).default([]),
});

export const manualAssignmentSchema = z.object({
  task_id: z.coerce.number().int().positive(),
  assigned_to: z.coerce.number().int().positive(),
  day_of_week: z
    .union([z.coerce.number().int().min(1).max(7), dayToken.transform((t) => tokenToDow(t))]),
});

export const assignmentIdParam = z.object({
  id: z.coerce.number().int().positive(),
});
