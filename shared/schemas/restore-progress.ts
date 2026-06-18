import { z } from 'zod';
import { modeIdSchema } from './mode';
import { tabSnapshotSchema } from './tab-snapshot';

export const restoreProgressStatusSchema = z.enum([
  'running',
  'completed',
  'failed',
  'cancelled',
]);

export const restoreProgressSchema = z.object({
  jobId: z.string().uuid(),
  modeId: modeIdSchema,
  total: z.number().int().min(0),
  completed: z.number().int().min(0),
  status: restoreProgressStatusSchema,
  error: z.string().max(500).optional(),
});

export const restoreQueueSchema = z.object({
  jobId: z.string().uuid(),
  modeId: modeIdSchema,
  snapshots: z.array(tabSnapshotSchema),
  nextIndex: z.number().int().min(0),
  windowId: z.number().int(),
});

export type RestoreProgress = z.infer<typeof restoreProgressSchema>;
export type RestoreProgressStatus = z.infer<typeof restoreProgressStatusSchema>;
export type RestoreQueue = z.infer<typeof restoreQueueSchema>;
