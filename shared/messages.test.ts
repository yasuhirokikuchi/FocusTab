import { describe, expect, it } from 'vitest';
import { isIncomingMessage } from './messages';

describe('isIncomingMessage', () => {
  it('有効なメッセージ型を受け入れる', () => {
    expect(isIncomingMessage({ type: 'GET_STATE' })).toBe(true);
    expect(
      isIncomingMessage({ type: 'MODE_SWITCH', targetModeId: 'work', confirmed: true }),
    ).toBe(true);
    expect(
      isIncomingMessage({ type: 'TASK_DELETE_ARCHIVED', modeId: 'work' }),
    ).toBe(true);
  });

  it('type がないオブジェクトは拒否する', () => {
    expect(isIncomingMessage(null)).toBe(false);
    expect(isIncomingMessage({})).toBe(false);
    expect(isIncomingMessage({ foo: 'bar' })).toBe(false);
  });
});
