import { useEffect, useState } from 'react';
import type { LockState } from '@/shared/schemas';

export function getLockTotalMs(lockState: LockState): number {
  const fromTimestamps =
    new Date(lockState.expiresAt).getTime() - new Date(lockState.lockedAt).getTime();
  if (fromTimestamps > 0) return fromTimestamps;
  return lockState.durationMinutes * 60_000;
}

/** 残り時間の割合（0〜1）。1 = 開始直後、0 = 期限切れ */
export function getLockRemainingRatio(remainingMs: number, totalMs: number): number {
  if (totalMs <= 0) return 0;
  return Math.min(1, Math.max(0, remainingMs / totalMs));
}

export function useLockCountdown(lockState: LockState | null): number {
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    if (!lockState) {
      setRemainingMs(0);
      return;
    }

    const tick = () => {
      const ms = new Date(lockState.expiresAt).getTime() - Date.now();
      setRemainingMs(Math.max(0, ms));
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [lockState]);

  return remainingMs;
}

export function formatRemainingTime(ms: number): string {
  if (ms <= 0) return '0分';

  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}時間${minutes}分`;
  }
  if (minutes > 0) {
    return `${minutes}分${seconds}秒`;
  }
  return `${seconds}秒`;
}

/** ポモドーロタイマー風の MM:SS / H:MM:SS 表示 */
export function formatRemainingTimeDigital(ms: number): string {
  if (ms <= 0) return '0:00';

  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${minutes}:${pad(seconds)}`;
}
