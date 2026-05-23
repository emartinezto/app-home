import { z } from 'zod';

export const createReassignmentSchema = z.object({
  reason: z.string().trim().max(500).optional().nullable(),
});

export const rejectReassignmentSchema = z.object({
  rejection_reason: z.string().trim().max(500).optional().nullable(),
});

export const reassignmentIdParam = z.object({
  id: z.coerce.number().int().positive(),
});

export const assignmentIdParamForReassign = z.object({
  id: z.coerce.number().int().positive(),
});

export const listReassignmentsQuery = z.object({
  status: z.enum(['pending', 'accepted', 'rejected', 'cancelled']).optional(),
  direction: z.enum(['incoming', 'outgoing', 'all']).default('all'),
});
