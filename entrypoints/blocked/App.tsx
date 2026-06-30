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

function isLockActive(lockState: AppState['lockState']): boolean {
  if (!lockState) return false;
  return new Date(lockState.expiresAt).getTime() > Date.now();
}

export default function App() {
  const reason = useQueryParam('reason') ?? 'blacklist';
  const site = useQueryParam('site');
  const [modeName, setModeName] = useState('…');
  const [locked, setLocked] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    void sendCommand<AppState>({ type: 'GET_STATE' }).then((res) => {
      if (res.ok && res.data) {
        setModeName(res.data.activeMode.name);
        setLocked(isLockActive(res.data.lockState));
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
            <p className="success">モードロックを解除しました</p>
            <p className="muted">
              このサイトへのアクセス制限は続いています。別のモードに切り替えるにはタスク一覧へ戻ってください。
            </p>
            <PortalLink>タスク一覧へ</PortalLink>
          </>
        ) : (
          <>
            <p>
              {reason === 'blacklist' && site
                ? `${site} へのアクセスは制限されています`
                : 'タスクに戻りましょう'}
            </p>
            {locked ? (
              <p className="muted">
                モードロック中のため切替できません。右下からロックのみ緊急解除できます（このサイトの制限は解除されません）。
              </p>
            ) : (
              <p className="muted">別のモードに切り替えるには、タスク一覧へ戻ってください。</p>
            )}
            <PortalLink>タスク一覧へ</PortalLink>
          </>
        )}
      </div>

      {!unlocked && locked && (
        <button
          type="button"
          className="emergency"
          aria-label="モードロックの緊急解除"
          onClick={() => setShowEmergency(true)}
        >
          モードロック解除
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
