import { z } from 'zod';
import { CURRENT_SCHEMA_VERSION } from '../constants';
import { bookmarkSchema } from './bookmark';
import { lockStateSchema } from './lock-state';
import { modeSchema } from './mode';
import { restoreProgressSchema, restoreQueueSchema } from './restore-progress';
import { defaultSettings, settingsSchema } from './settings';
import { tabSnapshotsByModeSchema } from './tab-snapshot';
import { taskSchema } from './task';

export const storageSchema = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  modes: z.array(modeSchema),
  activeModeId: z.string(),
  tasks: z.array(taskSchema),
  bookmarks: z.array(bookmarkSchema),
  lockState: lockStateSchema.nullable(),
  settings: settingsSchema,
  tabSnapshots: tabSnapshotsByModeSchema,
  restoreProgress: restoreProgressSchema.nullable(),
});

export const sessionSchema = z.object({
  restoreQueue: restoreQueueSchema.nullable().optional(),
});

/** 部分読み込み用 — マイグレーション入力 */
export const rawStorageSchema = z
  .object({
    schemaVersion: z.number().int().optional(),
    modes: z.array(z.unknown()).optional(),
    activeModeId: z.string().optional(),
    tasks: z.array(z.unknown()).optional(),
    bookmarks: z.array(z.unknown()).optional(),
    lockState: z.unknown().nullable().optional(),
    settings: z.unknown().optional(),
    tabSnapshots: z.record(z.string(), z.array(z.unknown())).optional(),
    restoreProgress: z.unknown().nullable().optional(),
  })
  .passthrough();

export type StorageSchema = z.infer<typeof storageSchema>;
export type SessionSchema = z.infer<typeof sessionSchema>;
export type RawStorage = z.infer<typeof rawStorageSchema>;

export { defaultSettings };
