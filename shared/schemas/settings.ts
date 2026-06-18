import { z } from 'zod';
import {
  RESTORE_BATCH_SIZE_MAX,
  RESTORE_BATCH_SIZE_MIN,
} from '../constants';

export const settingsSchema = z.object({
  confirmModeSwitch: z.boolean(),
  restoreBatchSize: z
    .number()
    .int()
    .min(RESTORE_BATCH_SIZE_MIN)
    .max(RESTORE_BATCH_SIZE_MAX),
  onboardingCompleted: z.boolean(),
  showRestoreProgress: z.boolean(),
});

export const settingsSummarySchema = settingsSchema.pick({
  confirmModeSwitch: true,
  showRestoreProgress: true,
  onboardingCompleted: true,
  restoreBatchSize: true,
});

export type Settings = z.infer<typeof settingsSchema>;
export type SettingsSummary = z.infer<typeof settingsSummarySchema>;

export const defaultSettings: Settings = {
  confirmModeSwitch: true,
  restoreBatchSize: 3,
  onboardingCompleted: false,
  showRestoreProgress: true,
};
