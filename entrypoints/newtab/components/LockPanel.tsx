import { useState, type FormEvent } from 'react';
import type { LockState } from '@/shared/schemas';
import { LOCK_DURATION_MAX, LOCK_DURATION_MIN } from '@/shared/constants';
import { parseLockDurationInput } from '@/shared/lock-duration';
import { formatRemainingTime, useLockCountdown } from '../hooks/useLockCountdown';

const LOCK_PRESETS = [15, 30, 60, 120] as const;

interface Props {
  lockState: LockState | null;
  disabled: boolean;
  onLock: (durationMinutes: number) => Promise<void>;
}

export function LockPanel({ lockState, disabled, onLock }: Props) {
  const [busy, setBusy] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);
  const remainingMs = useLockCountdown(lockState);
  const locked = Boolean(lockState && remainingMs > 0);

  const handleLock = async (minutes: number) => {
    if (disabled || busy || locked) return;
    setBusy(true);
    setCustomError(null);
    await onLock(minutes);
    setCustomMinutes('');
    setBusy(false);
  };

  const handleCustomSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (disabled || busy || locked) return;

    const result = parseLockDurationInput(customMinutes);
    if (!result.ok) {
      setCustomError(result.message);
      return;
    }

    void handleLock(result.minutes);
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

          <div className="lock-custom">
            <p className="muted lock-custom-label">カスタム時間</p>
            <form className="lock-custom-form" onSubmit={handleCustomSubmit}>
              <div className="lock-custom-field">
                <input
                  type="number"
                  className="lock-custom-input"
                  value={customMinutes}
                  min={LOCK_DURATION_MIN}
                  max={LOCK_DURATION_MAX}
                  step={1}
                  inputMode="numeric"
                  placeholder="分"
                  disabled={disabled || busy}
                  aria-label={`カスタムロック時間（${LOCK_DURATION_MIN}〜${LOCK_DURATION_MAX} 分）`}
                  aria-invalid={customError ? true : undefined}
                  aria-describedby={customError ? 'lock-custom-error' : undefined}
                  onChange={(e) => {
                    setCustomMinutes(e.target.value);
                    if (customError) setCustomError(null);
                  }}
                />
                <span className="lock-custom-unit" aria-hidden="true">
                  分
                </span>
              </div>
              <button
                type="submit"
                className="btn btn-primary lock-custom-submit"
                disabled={disabled || busy || !customMinutes.trim()}
                aria-label="カスタム時間でロック"
              >
                ロック
              </button>
            </form>
            {customError && (
              <p id="lock-custom-error" className="lock-custom-error" role="alert">
                {customError}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
