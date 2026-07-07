import { describe, expect, it } from 'vitest';
import type { LockState } from '@/shared/schemas';
import {
  formatRemainingTime,
  formatRemainingTimeDigital,
  getLockRemainingRatio,
  getLockTotalMs,
} from './useLockCountdown';

const lockState: LockState = {
  lockedAt: '2026-06-18T10:00:00.000Z',
  expiresAt: '2026-06-18T10:25:00.000Z',
  durationMinutes: 25,
  modeIdAtLock: 'work',
};

describe('getLockTotalMs', () => {
  it('lockedAt と expiresAt の差分を返す', () => {
    expect(getLockTotalMs(lockState)).toBe(25 * 60_000);
  });
});

describe('getLockRemainingRatio', () => {
  it('残り時間の割合を 0〜1 で返す', () => {
    expect(getLockRemainingRatio(15 * 60_000, 30 * 60_000)).toBe(0.5);
    expect(getLockRemainingRatio(0, 30 * 60_000)).toBe(0);
    expect(getLockRemainingRatio(40 * 60_000, 30 * 60_000)).toBe(1);
  });
});

describe('formatRemainingTimeDigital', () => {
  it('MM:SS 形式で表示する', () => {
    expect(formatRemainingTimeDigital(125 * 1000)).toBe('2:05');
    expect(formatRemainingTimeDigital(45 * 1000)).toBe('0:45');
    expect(formatRemainingTimeDigital(0)).toBe('0:00');
  });

  it('1 時間以上は H:MM:SS', () => {
    expect(formatRemainingTimeDigital(90 * 60 * 1000)).toBe('1:30:00');
  });
});

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
