import { useEffect, useState } from 'react';
import { sendCommand } from '@/shared/messaging';
import type { AppState } from '@/shared/messages';
import { EmergencyUnlockModal } from './components/EmergencyUnlockModal';
import './style.css';

const PORTAL_URL = chrome.runtime.getURL('newtab.html');

function useQueryParam(key: string): string | null {
  return new URLSearchParams(window.location.search).get(key);
}

function PortalLink({ children }: { children: React.ReactNode }) {
  return (
    <a className="cta" href={PORTAL_URL}>
      {children}
    </a>
  );
}

export default function App() {
  const reason = useQueryParam('reason') ?? 'blacklist';
  const site = useQueryParam('site');
  const [modeName, setModeName] = useState('…');
  const [showEmergency, setShowEmergency] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    void sendCommand<AppState>({ type: 'GET_STATE' }).then((res) => {
      if (res.ok && res.data) {
        setModeName(res.data.activeMode.name);
      }
    });
  }, []);

  const handleUnlockSuccess = () => {
    setUnlocked(true);
    setShowEmergency(false);
  };

  return (
    <div className="blocked">
      <div className="main">
        <h1>現在は{modeName}モードです</h1>
        {unlocked ? (
          <>
            <p className="success">ロックを解除しました</p>
            <PortalLink>タスク一覧へ</PortalLink>
          </>
        ) : (
          <>
            <p>
              {reason === 'blacklist' && site
                ? `${site} へのアクセスは制限されています`
                : 'タスクに戻りましょう'}
            </p>
            <PortalLink>タスク一覧へ</PortalLink>
          </>
        )}
      </div>

      {!unlocked && (
        <button
          type="button"
          className="emergency"
          aria-label="緊急解除"
          onClick={() => setShowEmergency(true)}
        >
          緊急解除
        </button>
      )}

      {showEmergency && (
        <EmergencyUnlockModal
          onClose={() => setShowEmergency(false)}
          onSuccess={handleUnlockSuccess}
        />
      )}
    </div>
  );
}
