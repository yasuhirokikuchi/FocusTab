import { describe, expect, it } from 'vitest';
import { FocusTabError, isFocusTabError, toMessageError } from './errors';

describe('FocusTabError', () => {
  it('code と message を保持する', () => {
    const err = new FocusTabError('LOCKED', 'ロック中です');
    expect(err.code).toBe('LOCKED');
    expect(err.message).toBe('ロック中です');
    expect(isFocusTabError(err)).toBe(true);
  });
});

describe('toMessageError', () => {
  it('FocusTabError をそのまま変換する', () => {
    const err = new FocusTabError('INVALID_MODE', 'モードが見つかりません');
    expect(toMessageError(err)).toEqual({
      code: 'INVALID_MODE',
      message: 'モードが見つかりません',
    });
  });

  it('通常の Error は INTERNAL に変換する', () => {
    expect(toMessageError(new Error('boom'))).toEqual({
      code: 'INTERNAL',
      message: 'boom',
    });
  });

  it('不明な値は汎用メッセージにする', () => {
    expect(toMessageError(null)).toEqual({
      code: 'INTERNAL',
      message: '内部エラーが発生しました',
    });
  });
});
