import { z } from 'zod';

export const tabSnapshotSchema = z.object({
  url: z.string().url().max(2048),
  title: z.string().max(500),
  pinned: z.boolean(),
  index: z.number().int().min(0),
  savedAt: z.string().datetime(),
});

export const tabSnapshotsByModeSchema = z.record(
  z.string(),
  z.array(tabSnapshotSchema),
);

export type TabSnapshot = z.infer<typeof tabSnapshotSchema>;
export type TabSnapshotsByMode = z.infer<typeof tabSnapshotsByModeSchema>;
