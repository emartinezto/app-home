import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(128, 'La contraseña es demasiado larga');

const emailSchema = z.string().trim().toLowerCase().email('Email inválido').max(255);

const nameSchema = z.string().trim().min(1, 'Nombre obligatorio').max(100);

const colorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Color debe ser hex #RRGGBB')
  .optional();

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  avatar_color: colorSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Contraseña obligatoria'),
});

export const refreshSchema = z.object({
  refresh_token: z.string().min(1),
});

export const logoutSchema = z.object({
  refresh_token: z.string().min(1),
});
