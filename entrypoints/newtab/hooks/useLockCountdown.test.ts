import { describe, expect, it } from 'vitest';
import { formatRemainingTime } from './useLockCountdown';

describe('formatRemainingTime', () => {
  it('0 以下は 0分', () => {
    expect(formatRemainingTime(0)).toBe('0分');
    expect(formatRemainingTime(-1000)).toBe('0分');
  });

  it('1 時間以上は時間と分', () => {
    expect(formatRemainingTime(90 * 60 * 1000)).toBe('1時間30分');
  });

  it('1 分以上は分と秒', () => {
    expect(formatRemainingTime(125 * 1000)).toBe('2分5秒');
  });

  it('1 分未満は秒のみ', () => {
    expect(formatRemainingTime(45 * 1000)).toBe('45秒');
  });
});
