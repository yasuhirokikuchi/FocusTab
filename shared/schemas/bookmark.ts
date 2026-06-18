import { z } from 'zod';
import { MAX_BOOKMARK_TITLE_LENGTH } from '../constants';
import { modeIdSchema } from './mode';

export const bookmarkIdSchema = z.string().uuid();

export const bookmarkSchema = z.object({
  id: bookmarkIdSchema,
  modeId: modeIdSchema,
  url: z.string().url().max(2048),
  title: z.string().min(1).max(MAX_BOOKMARK_TITLE_LENGTH),
  sortOrder: z.number().int().min(0),
  createdAt: z.string().datetime(),
});

export type Bookmark = z.infer<typeof bookmarkSchema>;
export type BookmarkId = z.infer<typeof bookmarkIdSchema>;
