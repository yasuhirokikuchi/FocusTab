import { useCallback, useEffect, useState } from 'react';
import type { TabSnapshot } from '@/shared/schemas';
import { MAX_TABS_PER_SNAPSHOT } from '@/shared/constants';

interface Props {
  modeId: string;
  disabled: boolean;
  onList: (modeId: string) => Promise<TabSnapshot[] | null>;
  onRemove: (modeId: string, index: number) => Promise<boolean>;
  onClear: (modeId: string) => Promise<boolean>;
}

function formatSavedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function TabSnapshotSection({
  modeId,
  disabled,
  onList,
  onRemove,
  onClear,
}: Props) {
  const [snapshots, setSnapshots] = useState<TabSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSnapshots = useCallback(async () => {
    setLoading(true);
    setError(null);
    const list = await onList(modeId);
    if (list === null) {
      setError('保存済みタブの取得に失敗しました');
      setSnapshots([]);
    } else {
      setSnapshots(list);
    }
    setLoading(false);
  }, [modeId, onList]);

  useEffect(() => {
    void loadSnapshots();
  }, [loadSnapshots]);

  const handleRemove = async (index: number) => {
    if (disabled || busy) return;
    setBusy(true);
    setError(null);
    const ok = await onRemove(modeId, index);
    if (ok) {
      await loadSnapshots();
    } else {
      setError('タブの削除に失敗しました');
    }
    setBusy(false);
  };

  const handleClearAll = async () => {
    if (disabled || busy || snapshots.length === 0) return;
    if (
      !window.confirm(
        `保存済みタブ ${snapshots.length} 件をすべて削除します。\nこの操作は元に戻せません。続行しますか？`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    const ok = await onClear(modeId);
    if (ok) {
      await loadSnapshots();
    } else {
      setError('タブの一括削除に失敗しました');
    }
    setBusy(false);
  };

  return (
    <section className="tab-snapshot-section" aria-labelledby="tab-snapshot-heading">
      <h4 id="tab-snapshot-heading">保存済みタブ</h4>
      <p className="muted tab-snapshot-summary">
        {loading
          ? '読み込み中…'
          : `${snapshots.length} 件のタブが保存されています`}
        {!loading && snapshots.length >= MAX_TABS_PER_SNAPSHOT && (
          <span className="tab-snapshot-limit">（上限 {MAX_TABS_PER_SNAPSHOT} 件）</span>
        )}
      </p>

      {error && (
        <p className="form-error tab-snapshot-error" role="alert">
          {error}
        </p>
      )}

      {!loading && snapshots.length > 0 && (
        <>
          <div className="tab-snapshot-toolbar">
            <button
              type="button"
              className="btn btn-ghost btn-sm tab-snapshot-clear-all"
              disabled={disabled || busy}
              aria-label={`保存済みタブ ${snapshots.length} 件をすべて削除`}
              onClick={() => void handleClearAll()}
            >
              すべて削除
            </button>
          </div>
          <ul className="tab-snapshot-list" aria-label="保存済みタブ一覧">
            {snapshots.map((snapshot, index) => (
              <li key={`${snapshot.url}-${snapshot.savedAt}-${index}`} className="tab-snapshot-item">
                <div className="tab-snapshot-info">
                  <span className="tab-snapshot-title">{snapshot.title || '（タイトルなし）'}</span>
                  <span className="tab-snapshot-url" title={snapshot.url}>
                    {snapshot.url}
                  </span>
                  <span className="tab-snapshot-date">保存: {formatSavedAt(snapshot.savedAt)}</span>
                </div>
                <button
                  type="button"
                  className="btn-icon"
                  disabled={disabled || busy}
                  aria-label={`${snapshot.title || snapshot.url} を削除`}
                  onClick={() => void handleRemove(index)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {!loading && snapshots.length === 0 && (
        <p className="empty tab-snapshot-empty">保存済みタブはありません</p>
      )}
    </section>
  );
}
