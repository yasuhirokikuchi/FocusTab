import { migrateStorage, storageToRecord } from '@/shared/migration';
import { isIncomingMessage, type MessageResponse } from '@/shared/messages';
import { initWebNavigationHandlers } from './lib/blocking';
import { dispatchMessage, isFocusTabError, toMessageError } from './lib/router';
import { initLockAlarmListener, restoreLockFromAlarms } from './lib/lock';
import { getActiveMode, syncBlockingWithActiveMode } from './lib/mode';
import { resumeRestoreIfNeeded } from './lib/tabs';
import { saveStorage } from './lib/state';

export default defineBackground(() => {
  console.log('[FocusTab] Service worker loaded (Phase 4)');

  async function initializeStorage(): Promise<void> {
    const raw = await chrome.storage.local.get(null);
    const migrated = migrateStorage(raw);
    await saveStorage(migrated);
  }

  async function bootstrap(): Promise<void> {
    await initializeStorage();
    await restoreLockFromAlarms();
    await syncBlockingWithActiveMode();
    await resumeRestoreIfNeeded();
  }

  initLockAlarmListener();

  initWebNavigationHandlers(async () => {
    try {
      return getActiveMode();
    } catch {
      return null;
    }
  });

  chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install' || details.reason === 'update') {
      await bootstrap();
      console.log('[FocusTab] Bootstrap complete');
    }
  });

  chrome.runtime.onStartup.addListener(async () => {
    await bootstrap();
  });

  void bootstrap();

  chrome.runtime.onMessage.addListener(
    (raw: unknown, sender, sendResponse: (response: MessageResponse) => void) => {
      if (!isIncomingMessage(raw)) {
        sendResponse({
          ok: false,
          error: { code: 'INTERNAL', message: '不明なメッセージです' },
        });
        return true;
      }

      if (!sender.url?.startsWith('chrome-extension://')) {
        sendResponse({
          ok: false,
          error: { code: 'PERMISSION_DENIED', message: '許可されていない送信元です' },
        });
        return true;
      }

      void dispatchMessage(raw, { senderTabId: sender.tab?.id })
        .then((data) => sendResponse({ ok: true, data }))
        .catch((err: unknown) => {
          sendResponse({ ok: false, error: toMessageError(err) });
        });

      return true;
    },
  );
});
