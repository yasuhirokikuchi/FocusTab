import { describe, expect, it } from 'vitest';
import { MAX_TABS_PER_SNAPSHOT } from '@/shared/constants';
import type { TabSnapshot } from '@/shared/schemas';
import { trimSnapshots } from './tabs';

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
