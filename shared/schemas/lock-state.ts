import { z } from 'zod';
import { LOCK_DURATION_MAX, LOCK_DURATION_MIN } from '../constants';
import { modeIdSchema } from './mode';

export const lockStateSchema = z.object({
  lockedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  durationMinutes: z
    .number()
    .int()
    .min(LOCK_DURATION_MIN)
    .max(LOCK_DURATION_MAX),
  modeIdAtLock: modeIdSchema,
});

export type LockState = z.infer<typeof lockStateSchema>;
