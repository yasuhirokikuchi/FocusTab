import type { IncomingMessage, MessageResponse } from './messages';

export async function sendCommand<T>(
  message: IncomingMessage,
): Promise<MessageResponse<T>> {
  try {
    return await chrome.runtime.sendMessage(message);
  } catch {
    return {
      ok: false,
      error: {
        code: 'INTERNAL',
        message: 'Background との通信に失敗しました',
      },
    };
  }
}
