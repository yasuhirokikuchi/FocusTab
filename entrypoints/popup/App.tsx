import { useEffect, useState } from 'react';
import { sendCommand } from '@/shared/messaging';
import type { AppState } from '@/shared/messages';
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

  useEffect(() => {
    void sendCommand<AppState>({ type: 'GET_STATE' }).then((res) => {
      if (res.ok && res.data) setState(res.data);
      setLoading(false);
    });
  }, []);

  const locked = Boolean(state?.lockState);

  return (
    <div className="popup">
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
          {locked && <p className="popup-lock">🔒 モードロック中</p>}
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
