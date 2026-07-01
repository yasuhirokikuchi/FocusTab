import { describe, expect, it } from 'vitest';
import { parseLockDurationInput } from './lock-duration';
import { LOCK_DURATION_MAX, LOCK_DURATION_MIN } from './constants';

describe('parseLockDurationInput', () => {
  it('空文字はエラー', () => {
    expect(parseLockDurationInput('')).toEqual({
      ok: false,
      message: 'ロック時間を入力してください',
    });
    expect(parseLockDurationInput('   ')).toEqual({
      ok: false,
      message: 'ロック時間を入力してください',
    });
  });

  it('非整数はエラー', () => {
    expect(parseLockDurationInput('25.5')).toEqual({
      ok: false,
      message: '整数（分）で入力してください',
    });
    expect(parseLockDurationInput('abc')).toEqual({
      ok: false,
      message: '整数（分）で入力してください',
    });
  });

  it('範囲外はエラー', () => {
    expect(parseLockDurationInput('0')).toEqual({
      ok: false,
      message: `${LOCK_DURATION_MIN}〜${LOCK_DURATION_MAX} 分の範囲で入力してください`,
    });
    expect(parseLockDurationInput('481')).toEqual({
      ok: false,
      message: `${LOCK_DURATION_MIN}〜${LOCK_DURATION_MAX} 分の範囲で入力してください`,
    });
  });

  it('有効な整数は minutes を返す', () => {
    expect(parseLockDurationInput('1')).toEqual({ ok: true, minutes: 1 });
    expect(parseLockDurationInput('25')).toEqual({ ok: true, minutes: 25 });
    expect(parseLockDurationInput(String(LOCK_DURATION_MAX))).toEqual({
      ok: true,
      minutes: LOCK_DURATION_MAX,
    });
  });

  it('前後の空白はトリムされる', () => {
    expect(parseLockDurationInput('  60  ')).toEqual({ ok: true, minutes: 60 });
  });
});
