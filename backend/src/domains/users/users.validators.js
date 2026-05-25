import { z } from 'zod';

const dayScheduleSchema = z
  .object({
    location: z.enum(['office', 'home', 'off']).default('home'),
    start: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato HH:MM')
      .optional()
      .nullable(),
    end: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato HH:MM')
      .optional()
      .nullable(),
  })
  .refine(
    (v) => {
      if (v.location === 'off') return true;
      if (!v.start || !v.end) return false;
      return v.start < v.end;
    },
    { message: 'start debe ser anterior a end (o location="off")' },
  );

const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const workScheduleSchema = z
  .object(
    Object.fromEntries(dayKeys.map((d) => [d, dayScheduleSchema.optional()])),
  )
  .strict();

export const partnerResetSchema = z.object({
  new_password: z.string().min(8).max(128),
});

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    avatar_color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, 'Color debe ser hex #RRGGBB')
      .optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Nada que actualizar' });

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(500),
  keys: z.object({
    p256dh: z.string().min(1).max(255),
    auth: z.string().min(1).max(255),
  }),
});

export const subscriptionIdParam = z.object({
  id: z.coerce.number().int().positive(),
});
