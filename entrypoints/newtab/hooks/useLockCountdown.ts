import { useEffect, useState } from 'react';
import type { LockState } from '@/shared/schemas';

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
