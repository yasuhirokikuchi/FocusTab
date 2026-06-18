import { z } from 'zod';
import { MAX_TASK_TEXT_LENGTH } from '../constants';
import { modeIdSchema } from './mode';

export const taskIdSchema = z.string().uuid();

export const taskSchema = z.object({
  id: taskIdSchema,
  modeId: modeIdSchema,
  text: z.string().min(1).max(MAX_TASK_TEXT_LENGTH),
  completed: z.boolean(),
  sortOrder: z.number().int().min(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  archivedAt: z.string().datetime().optional(),
});

export type Task = z.infer<typeof taskSchema>;
export type TaskId = z.infer<typeof taskIdSchema>;
