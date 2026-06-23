import { describe, expect, it } from 'vitest';
import { createDefaultStorage } from '@/shared/seed/default-data';
import { seedStorage } from '../../../tests/helpers/chrome-mock';
import { handleBookmarkUpdate } from './handlers';
import { loadStorage } from './state';

describe('handleBookmarkUpdate', () => {
  it('ブックマークの URL とタイトルを更新する', async () => {
    const base = createDefaultStorage();
    const bookmarkId = base.bookmarks[0].id;
    seedStorage(base);

    await handleBookmarkUpdate(bookmarkId, {
      url: 'https://example.com',
      title: 'Example',
    });

    const data = await loadStorage();
    const bookmark = data.bookmarks.find((b) => b.id === bookmarkId);
    expect(bookmark?.url).toBe('https://example.com');
    expect(bookmark?.title).toBe('Example');
  });
});
