import type { ErrorCode } from '@/shared/messages';

export class FocusTabError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'FocusTabError';
  }
}

export function isFocusTabError(err: unknown): err is FocusTabError {
  return err instanceof FocusTabError;
}

export function toMessageError(err: unknown): { code: ErrorCode; message: string } {
  if (isFocusTabError(err)) {
    return { code: err.code, message: err.message };
  }
  if (err instanceof Error) {
    return { code: 'INTERNAL', message: err.message };
  }
  return { code: 'INTERNAL', message: '内部エラーが発生しました' };
}
