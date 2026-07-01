import { LOCK_DURATION_MAX, LOCK_DURATION_MIN } from './constants';

export type LockDurationParseResult =
  | { ok: true; minutes: number }
  | { ok: false; message: string };

/** カスタムロック時間入力（分）を検証する */
export function parseLockDurationInput(raw: string): LockDurationParseResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, message: 'ロック時間を入力してください' };
  }
  if (!/^\d+$/.test(trimmed)) {
    return { ok: false, message: '整数（分）で入力してください' };
  }

  const minutes = Number(trimmed);
  if (minutes < LOCK_DURATION_MIN || minutes > LOCK_DURATION_MAX) {
    return {
      ok: false,
      message: `${LOCK_DURATION_MIN}〜${LOCK_DURATION_MAX} 分の範囲で入力してください`,
    };
  }

  return { ok: true, minutes };
}
