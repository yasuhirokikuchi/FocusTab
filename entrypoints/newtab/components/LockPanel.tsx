import { useState } from 'react';
import type { LockState } from '@/shared/schemas';
import { formatRemainingTime, useLockCountdown } from '../hooks/useLockCountdown';

const LOCK_PRESETS = [15, 30, 60, 120] as const;

interface Props {
  lockState: LockState | null;
  disabled: boolean;
  onLock: (durationMinutes: number) => Promise<void>;
}

export function LockPanel({ lockState, disabled, onLock }: Props) {
  const [busy, setBusy] = useState(false);
  const remainingMs = useLockCountdown(lockState);
  const locked = Boolean(lockState && remainingMs > 0);

  const handleLock = async (minutes: number) => {
    if (disabled || busy || locked) return;
    setBusy(true);
    await onLock(minutes);
    setBusy(false);
  };

  return (
    <section className="panel lock-panel" aria-labelledby="lock-heading">
      <h2 id="lock-heading">モードロック</h2>

      {locked && lockState ? (
        <div className="lock-active" role="status" aria-live="polite">
          <span className="lock-icon" aria-hidden="true">
            🔒
          </span>
          <p className="lock-message">ロック中 — モード切替不可</p>
          <p className="lock-remaining">
            残り <strong>{formatRemainingTime(remainingMs)}</strong>
          </p>
          <p className="muted lock-hint">
            モードロックの緊急解除は、制限サイトを開いたときのブロック画面右下から可能です（サイトの制限は解除されません）
          </p>
        </div>
      ) : (
        <div className="lock-presets">
          <p className="muted">集中時間を設定してモード切替をロックします</p>
          <div className="preset-buttons" role="group" aria-label="ロック時間">
            {LOCK_PRESETS.map((minutes) => (
              <button
                key={minutes}
                type="button"
                className="btn btn-lock"
                disabled={disabled || busy}
                aria-label={`${minutes}分間ロック`}
                onClick={() => void handleLock(minutes)}
              >
                {minutes}分
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
