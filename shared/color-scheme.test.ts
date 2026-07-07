import { describe, expect, it } from 'vitest';
import { resolveColorScheme } from './color-scheme';

describe('resolveColorScheme', () => {
  it('light / dark はそのまま返す', () => {
    expect(resolveColorScheme('light', true)).toBe('light');
    expect(resolveColorScheme('dark', false)).toBe('dark');
  });

  it('system は OS の設定に従う', () => {
    expect(resolveColorScheme('system', true)).toBe('dark');
    expect(resolveColorScheme('system', false)).toBe('light');
  });
});
