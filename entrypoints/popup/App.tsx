import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { sendCommand } from '@/shared/messaging';
import type { AppState, ModeSwitchResponse } from '@/shared/messages';
import { themeCssVariables } from '@/shared/theme';
import { ModeSwitcher } from '../newtab/components/ModeSwitcher';
import { formatRemainingTime, useLockCountdown } from '../newtab/hooks/useLockCountdown';
import './style.css';

const PORTAL_URL = chrome.runtime.getURL('newtab.html');
const SETTINGS_URL = chrome.runtime.getURL('newtab.html?settings=1');

function openTab(url: string) {
  void chrome.tabs.create({ url });
  window.close();
}

export default function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await sendCommand<AppState>({ type: 'GET_STATE' });
    if (res.ok && res.data) {
      setState(res.data);
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    void refresh().finally(() => setLoading(false));
  }, [refresh]);

  const remainingMs = useLockCountdown(state?.lockState ?? null);
  const locked = Boolean(state?.lockState && remainingMs > 0);

  const handleSwitch = async (targetModeId: string) => {
    if (!state || locked || switching) return;

    const needsConfirm = state.settings.confirmModeSwitch;
    if (needsConfirm) {
      const mode = state.modes.find((m) => m.id === targetModeId);
      if (
        !window.confirm(
          `「${mode?.name ?? targetModeId}」モードに切り替えます。\n` +
            '現在のタブは退避され、保存済みタブが復元されます。続行しますか？',
        )
      ) {
        return;
      }
    }

    setSwitching(true);
    setError(null);
    const res = await sendCommand<ModeSwitchResponse>({
      type: 'MODE_SWITCH',
      targetModeId,
      confirmed: true,
    });
    setSwitching(false);

    if (!res.ok) {
      setError(res.error?.message ?? 'モード切替に失敗しました');
      return;
    }
    await refresh();
  };

  const popupStyle = themeCssVariables as CSSProperties;

  return (
    <div className="popup" style={popupStyle}>
      <header className="popup-header">
        <h1>FocusTab</h1>
      </header>

      {loading ? (
        <p className="popup-muted">読み込み中…</p>
      ) : state ? (
        <div className="popup-body">
          <p className="popup-mode">
            現在: <strong>{state.activeMode.name}</strong>
          </p>
          {state.activeMode.isRestrictive && (
            <p className="popup-badge">閲覧制限あり</p>
          )}
          {locked && state.lockState && (
            <p className="popup-lock" role="status" aria-live="polite">
              🔒 ロック中 — 残り {formatRemainingTime(remainingMs)}
            </p>
          )}
          {switching && (
            <p className="popup-muted" role="status" aria-live="polite">
              モード切替中…
            </p>
          )}
          {error && (
            <p className="popup-error" role="alert">
              {error}
            </p>
          )}

          <ModeSwitcher
            modes={state.modes}
            activeModeId={state.activeModeId}
            locked={locked}
            switching={switching}
            onSwitch={(modeId) => void handleSwitch(modeId)}
          />
        </div>
      ) : (
        <p className="popup-muted">状態を取得できませんでした</p>
      )}

      <nav className="popup-actions" aria-label="クイックアクション">
        <button type="button" className="popup-btn primary" onClick={() => openTab(PORTAL_URL)}>
          ポータルを開く
        </button>
        <button type="button" className="popup-btn" onClick={() => openTab(SETTINGS_URL)}>
          設定
        </button>
      </nav>
    </div>
  );
}
