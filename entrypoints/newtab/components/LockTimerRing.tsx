import type { LockState } from '@/shared/schemas';
import {
  formatRemainingTime,
  formatRemainingTimeDigital,
  getLockRemainingRatio,
  getLockTotalMs,
} from '../hooks/useLockCountdown';

const SIZE = 132;
const STROKE_WIDTH = 8;

interface Props {
  lockState: LockState;
  remainingMs: number;
}

export function LockTimerRing({ lockState, remainingMs }: Props) {
  const totalMs = getLockTotalMs(lockState);
  const ratio = getLockRemainingRatio(remainingMs, totalMs);
  const radius = (SIZE - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - ratio);
  const center = SIZE / 2;
  const digitalTime = formatRemainingTimeDigital(remainingMs);
  const spokenTime = formatRemainingTime(remainingMs);

  return (
    <div
      className="lock-timer-ring-wrap"
      role="img"
      aria-label={`ロック残り時間 ${spokenTime}`}
    >
      <svg
        className="lock-timer-ring"
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        aria-hidden="true"
      >
        <circle
          className="lock-timer-track"
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={STROKE_WIDTH}
        />
        <circle
          className="lock-timer-progress"
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={STROKE_WIDTH}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <span className="lock-timer-label" aria-hidden="true">
        {digitalTime}
      </span>
    </div>
  );
}
