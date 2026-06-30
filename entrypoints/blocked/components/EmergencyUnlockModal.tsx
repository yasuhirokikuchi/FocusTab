import { useState, type ClipboardEvent, type FormEvent } from 'react';
import { sendCommand } from '@/shared/messaging';
import { PENALTY_TEXT } from '@/shared/constants';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export function EmergencyUnlockModal({ onClose, onSuccess }: Props) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const preventPaste = (e: ClipboardEvent) => {
    e.preventDefault();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);
    const res = await sendCommand({ type: 'EMERGENCY_UNLOCK', penaltyText: input });
    setBusy(false);

    if (!res.ok) {
      setError(res.error?.message ?? '解除に失敗しました');
      return;
    }
    onSuccess();
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card">
        <h2 id="emergency-title">モードロックの緊急解除</h2>
        <p className="modal-desc">
          モードロックのみ解除します。このサイトへのアクセス制限は解除されません。解除後はタスク一覧から別のモードに切り替えてください。
        </p>
        <p className="modal-desc">
          以下の文を正確に入力してください。コピー＆ペーストはできません。
        </p>

        <blockquote className="penalty-reference" aria-label="入力すべき解除文">
          {PENALTY_TEXT}
        </blockquote>

        <form onSubmit={(e) => void handleSubmit(e)}>
          <textarea
            className="penalty-input"
            value={input}
            rows={3}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-label="解除文を入力"
            placeholder="上記の文を入力…"
            disabled={busy}
            onPaste={preventPaste}
            onDrop={(e) => e.preventDefault()}
            onChange={(e) => setInput(e.target.value)}
          />

          {error && (
            <p className="modal-error" role="alert">
              {error}
            </p>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={onClose}>
              キャンセル
            </button>
            <button
              type="submit"
              className="btn btn-danger"
              disabled={busy || !input.trim()}
              aria-label="モードロックを解除する"
            >
              ロックを解除する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
