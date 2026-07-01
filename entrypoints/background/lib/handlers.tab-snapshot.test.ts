import { describe, expect, it } from 'vitest';
import { createDefaultStorage } from '@/shared/seed/default-data';
import type { TabSnapshot } from '@/shared/schemas';
import { seedStorage } from '../../../tests/helpers/chrome-mock';
import { FocusTabError } from './errors';
import {
  handleTabSnapshotClear,
  handleTabSnapshotList,
  handleTabSnapshotRemove,
} from './handlers';

const ISO = '2026-06-18T00:00:00.000Z';

function snapshot(url: string, title: string, index: number): TabSnapshot {
  return {
    url,
    title,
    pinned: false,
    index,
    savedAt: ISO,
  };
}

describe('handleTabSnapshotList', () => {
  it('モード別スナップショット一覧を返す', async () => {
    const base = createDefaultStorage();
    seedStorage({
      ...base,
      tabSnapshots: {
        work: [
          snapshot('https://example.com/a', 'A', 0),
          snapshot('https://example.com/b', 'B', 1),
        ],
        study: [snapshot('https://example.com/c', 'C', 0)],
      },
    });

    const result = await handleTabSnapshotList('work');
    expect(result).toEqual({
      modeId: 'work',
      snapshots: [
        snapshot('https://example.com/a', 'A', 0),
        snapshot('https://example.com/b', 'B', 1),
      ],
    });
  });

  it('保存がないモードは空配列を返す', async () => {
    const base = createDefaultStorage();
    seedStorage(base);

    const result = await handleTabSnapshotList('work');
    expect(result).toEqual({ modeId: 'work', snapshots: [] });
  });

  it('存在しない modeId は INVALID_MODE', async () => {
    const base = createDefaultStorage();
    seedStorage(base);

    await expect(handleTabSnapshotList('missing')).rejects.toBeInstanceOf(FocusTabError);
    await expect(handleTabSnapshotList('missing')).rejects.toMatchObject({
      code: 'INVALID_MODE',
    });
  });
});

describe('handleTabSnapshotRemove', () => {
  it('指定インデックスのスナップショットを削除する', async () => {
    const base = createDefaultStorage();
    seedStorage({
      ...base,
      tabSnapshots: {
        work: [
          snapshot('https://example.com/a', 'A', 0),
          snapshot('https://example.com/b', 'B', 1),
          snapshot('https://example.com/c', 'C', 2),
        ],
      },
    });

    await handleTabSnapshotRemove('work', 1);

    const { loadStorage } = await import('./state');
    const data = await loadStorage();
    expect(data.tabSnapshots.work).toEqual([
      snapshot('https://example.com/a', 'A', 0),
      snapshot('https://example.com/c', 'C', 2),
    ]);
  });

  it('不正なインデックスはエラー', async () => {
    const base = createDefaultStorage();
    seedStorage({
      ...base,
      tabSnapshots: {
        work: [snapshot('https://example.com/a', 'A', 0)],
      },
    });

    await expect(handleTabSnapshotRemove('work', -1)).rejects.toMatchObject({
      code: 'INTERNAL',
    });
    await expect(handleTabSnapshotRemove('work', 1)).rejects.toMatchObject({
      code: 'INTERNAL',
    });
    await expect(handleTabSnapshotRemove('work', 1.5)).rejects.toMatchObject({
      code: 'INTERNAL',
    });
  });

  it('存在しない modeId は INVALID_MODE', async () => {
    const base = createDefaultStorage();
    seedStorage(base);

    await expect(handleTabSnapshotRemove('missing', 0)).rejects.toMatchObject({
      code: 'INVALID_MODE',
    });
  });
});

describe('handleTabSnapshotClear', () => {
  it('確認済みならモードのスナップショットをすべて削除する', async () => {
    const base = createDefaultStorage();
    seedStorage({
      ...base,
      tabSnapshots: {
        work: [
          snapshot('https://example.com/a', 'A', 0),
          snapshot('https://example.com/b', 'B', 1),
        ],
        study: [snapshot('https://example.com/c', 'C', 0)],
      },
    });

    const result = await handleTabSnapshotClear('work', true);
    expect(result).toEqual({ clearedCount: 2 });

    const { loadStorage } = await import('./state');
    const data = await loadStorage();
    expect(data.tabSnapshots.work).toEqual([]);
    expect(data.tabSnapshots.study).toHaveLength(1);
  });

  it('確認なしは CONFIRMATION_REQUIRED', async () => {
    const base = createDefaultStorage();
    seedStorage(base);

    await expect(handleTabSnapshotClear('work')).rejects.toMatchObject({
      code: 'CONFIRMATION_REQUIRED',
    });
    await expect(handleTabSnapshotClear('work', false)).rejects.toMatchObject({
      code: 'CONFIRMATION_REQUIRED',
    });
  });

  it('対象が 0 件でもエラーにしない', async () => {
    const base = createDefaultStorage();
    seedStorage(base);

    const result = await handleTabSnapshotClear('work', true);
    expect(result).toEqual({ clearedCount: 0 });
  });

  it('存在しない modeId は INVALID_MODE', async () => {
    const base = createDefaultStorage();
    seedStorage(base);

    await expect(handleTabSnapshotClear('missing', true)).rejects.toMatchObject({
      code: 'INVALID_MODE',
    });
  });
});
