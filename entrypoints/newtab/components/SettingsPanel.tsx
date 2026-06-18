import { useRef, useState } from 'react';
import type { SettingsSummary } from '@/shared/schemas';
import type { ExportDataResponse } from '@/shared/messages';
import { sendCommand } from '@/shared/messaging';
import {
  RESTORE_BATCH_SIZE_MAX,
  RESTORE_BATCH_SIZE_MIN,
} from '@/shared/constants';

interface Props {
  settings: SettingsSummary;
  disabled: boolean;
  onUpdate: (patch: Partial<SettingsSummary>) => Promise<void>;
  onClose: () => void;
}

function downloadJson(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function SettingsPanel({ settings, disabled, onUpdate, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleExport = async () => {
    setBusy(true);
    setMessage(null);
    const res = await sendCommand<ExportDataResponse>({ type: 'EXPORT_DATA' });
    setBusy(false);
    if (!res.ok || !res.data) {
      setMessage(res.error?.message ?? 'エクスポートに失敗しました');
      return;
    }
    const date = res.data.exportedAt.slice(0, 10);
    downloadJson(`focustab-backup-${date}.json`, res.data.json);
    setMessage('エクスポートしました');
  };

  const handleImportFile = async (file: File) => {
    const text = await file.text();
    if (
      !window.confirm(
        'インポートすると現在のデータがすべて上書きされます。続行しますか？',
      )
    ) {
      return;
    }
    setBusy(true);
    setMessage(null);
    const res = await sendCommand({ type: 'IMPORT_DATA', json: text, confirmed: true });
    setBusy(false);
    if (!res.ok) {
      setMessage(res.error?.message ?? 'インポートに失敗しました');
      return;
    }
    setMessage('インポートしました。ページを再読み込みします…');
    window.location.reload();
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card settings-card">
        <h2 id="settings-title">設定</h2>

        <fieldset className="settings-group" disabled={disabled || busy}>
          <legend>モード切替</legend>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={settings.confirmModeSwitch}
              onChange={(e) => void onUpdate({ confirmModeSwitch: e.target.checked })}
            />
            切替前に確認ダイアログを表示
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={settings.showRestoreProgress}
              onChange={(e) => void onUpdate({ showRestoreProgress: e.target.checked })}
            />
            タブ復元の進捗を表示
          </label>
          <label className="field-row">
            <span>復元バッチサイズ</span>
            <select
              value={settings.restoreBatchSize}
              onChange={(e) =>
                void onUpdate({ restoreBatchSize: Number(e.target.value) })
              }
            >
              {Array.from(
                { length: RESTORE_BATCH_SIZE_MAX - RESTORE_BATCH_SIZE_MIN + 1 },
                (_, i) => RESTORE_BATCH_SIZE_MIN + i,
              ).map((n) => (
                <option key={n} value={n}>
                  {n} タブ / バッチ
                </option>
              ))}
            </select>
          </label>
        </fieldset>

        <fieldset className="settings-group" disabled={disabled || busy}>
          <legend>データ</legend>
          <div className="settings-actions">
            <button type="button" className="btn btn-secondary" onClick={() => void handleExport()}>
              エクスポート（JSON）
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => fileRef.current?.click()}
            >
              インポート（JSON）
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImportFile(file);
                e.target.value = '';
              }}
            />
          </div>
        </fieldset>

        {message && <p className="settings-message">{message}</p>}

        <div className="modal-actions">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
