import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_TABS_PER_SNAPSHOT } from '@/shared/constants';
import type { TabSnapshot } from '@/shared/schemas';
import { SESSION_KEYS } from '@/shared/storage-keys';
import { getSessionSnapshot, restoreChromeTabMocks } from '../../../tests/helpers/chrome-mock';
import { buildModeSnapshot, startRestore, trimSnapshots } from './tabs';

function snapshot(index: number): TabSnapshot {
  return {
    url: `https://example.com/${index}`,
    title: `Tab ${index}`,
    pinned: false,
    index,
    savedAt: '2026-06-18T00:00:00.000Z',
  };
}

describe('trimSnapshots', () => {
  it('上限以下はそのまま返す', () => {
    const input = [snapshot(0), snapshot(1)];
    expect(trimSnapshots(input)).toEqual(input);
  });

  it('上限超過時は index 順で末尾を残す', () => {
    const input = Array.from({ length: MAX_TABS_PER_SNAPSHOT + 5 }, (_, i) =>
      snapshot(i),
    );
    const result = trimSnapshots(input);
    expect(result).toHaveLength(MAX_TABS_PER_SNAPSHOT);
    expect(result[0].index).toBe(5);
    expect(result[result.length - 1].index).toBe(MAX_TABS_PER_SNAPSHOT + 4);
  });
});

describe('buildModeSnapshot', () => {
  const existing: TabSnapshot[] = [
    {
      url: 'https://saved.example.com',
      title: 'Saved',
      pinned: false,
      index: 0,
      savedAt: '2026-06-18T00:00:00.000Z',
    },
  ];

  it('退避ありのときは退避結果を使う', () => {
    const evacuated = [snapshot(0)];
    expect(buildModeSnapshot(evacuated, existing)).toEqual(evacuated);
  });

  it('退避0件のときは既存を保持する', () => {
    expect(buildModeSnapshot([], existing)).toEqual(existing);
  });

  it('退避も既存もないときは空配列', () => {
    expect(buildModeSnapshot([], undefined)).toEqual([]);
  });
});

describe('startRestore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    restoreChromeTabMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('復元中に新しい復元が始まっても最新キューが処理される', async () => {
    const firstBatch = Array.from({ length: 5 }, (_, i) => snapshot(i));
    const secondBatch = [snapshot(10), snapshot(11)];

    const job1 = await startRestore(firstBatch, 'work', 1);
    const job2 = await startRestore(secondBatch, 'study', 1);

    await vi.runAllTimersAsync();

    const queue = getSessionSnapshot()[SESSION_KEYS.RESTORE_QUEUE];
    expect(queue).toBeFalsy();

    const createdUrls = vi
      .mocked(chrome.tabs.create)
      .mock.calls.map((call) => call[0].url);
    expect(createdUrls).toContain('https://example.com/10');
    expect(createdUrls).toContain('https://example.com/11');
    expect(job1).not.toBe(job2);
  });
});
