import { z } from 'zod';
import { MAX_BLACKLIST_DOMAINS, MAX_MODE_NAME_LENGTH } from '../constants';

export const modeIdSchema = z
  .string()
  .min(1)
  .max(32)
  .regex(/^[a-z0-9-]+$/, 'モード ID は小文字英数字とハイフンのみ');

export const themeTokensSchema = z.object({
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  bg: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  text: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const blacklistEntrySchema = z
  .string()
  .min(1)
  .max(253)
  .refine(
    (v) => !v.includes('://') && !v.includes('/'),
    'ドメインのみ（プロトコル・パス不可）',
  );

export const modeSchema = z.object({
  id: modeIdSchema,
  name: z.string().min(1).max(MAX_MODE_NAME_LENGTH),
  theme: themeTokensSchema,
  isRestrictive: z.boolean(),
  blacklist: z.array(blacklistEntrySchema).max(MAX_BLACKLIST_DOMAINS),
  sortOrder: z.number().int().min(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const modeInputSchema = modeSchema.omit({
  createdAt: true,
  updatedAt: true,
});

export const modeSummarySchema = modeSchema.pick({
  id: true,
  name: true,
  theme: true,
  isRestrictive: true,
});

export type ModeId = z.infer<typeof modeIdSchema>;
export type ThemeTokens = z.infer<typeof themeTokensSchema>;
export type Mode = z.infer<typeof modeSchema>;
export type ModeInput = z.infer<typeof modeInputSchema>;
export type ModeSummary = z.infer<typeof modeSummarySchema>;
