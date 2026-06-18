import { useCallback, useEffect, useState } from 'react';
import { sendCommand } from '@/shared/messaging';
import type { AppState } from '@/shared/messages';

const STORAGE_WATCH_KEYS = [
  'activeModeId',
  'lockState',
  'restoreProgress',
  'modes',
  'settings',
  'tasks',
  'bookmarks',
] as const;

export function useAppState() {
  const [state, setState] = useState<AppState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await sendCommand<AppState>({ type: 'GET_STATE' });
    if (res.ok && res.data) {
      setState(res.data);
      setError(null);
    } else {
      setError(res.error?.message ?? '状態の取得に失敗しました');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();

    const onChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area !== 'local') return;
      if (STORAGE_WATCH_KEYS.some((key) => key in changes)) {
        void refresh();
      }
    };

    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, [refresh]);

  return { state, error, loading, refresh, setError };
}
