import { useState, type FormEvent } from 'react';
import type { Mode } from '@/shared/schemas';
import { MAX_MODES, MAX_MODE_NAME_LENGTH } from '@/shared/constants';
import { DEFAULT_MODE_THEME, THEME_ACCENT_PRESETS, THEME_COLORS } from '@/shared/theme';

const PRESET_ACCENTS = [...THEME_ACCENT_PRESETS];

interface Props {
  modeConfigs: Mode[];
  activeModeId: string;
  disabled: boolean;
  onCreate: (mode: {
    id: string;
    name: string;
    theme: Mode['theme'];
    isRestrictive: boolean;
    blacklist: string[];
    sortOrder: number;
  }) => Promise<void>;
  onUpdate: (
    modeId: string,
    patch: Partial<{
      name: string;
      theme: Mode['theme'];
      isRestrictive: boolean;
      blacklist: string[];
    }>,
  ) => Promise<void>;
  onDelete: (modeId: string) => Promise<void>;
  onRestoreDefaults: () => Promise<void>;
  onClose: () => void;
}

function parseBlacklist(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function blacklistToText(blacklist: string[]): string {
  return blacklist.join('\n');
}

interface ModeFormState {
  id: string;
  name: string;
  accent: string;
  isRestrictive: boolean;
  blacklistText: string;
}

function emptyForm(sortOrder: number): ModeFormState {
  return {
    id: '',
    name: '',
    accent: THEME_COLORS.accent,
    isRestrictive: true,
    blacklistText: '',
  };
}

function modeToForm(mode: Mode): ModeFormState {
  return {
    id: mode.id,
    name: mode.name,
    accent: mode.theme.accent,
    isRestrictive: mode.isRestrictive,
    blacklistText: blacklistToText(mode.blacklist),
  };
}

export function ModeManager({
  modeConfigs,
  activeModeId,
  disabled,
  onCreate,
  onUpdate,
  onDelete,
  onRestoreDefaults,
  onClose,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<ModeFormState>(() =>
    emptyForm(modeConfigs.length),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEdit = (mode: Mode) => {
    setCreating(false);
    setEditingId(mode.id);
    setForm(modeToForm(mode));
    setError(null);
  };

  const startCreate = () => {
    setCreating(true);
    setEditingId(null);
    setForm(emptyForm(modeConfigs.length));
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || disabled) return;

    const name = form.name.trim();
    const blacklist = parseBlacklist(form.blacklistText);
    const theme = {
      accent: form.accent,
      bg: DEFAULT_MODE_THEME.bg,
      text: DEFAULT_MODE_THEME.text,
    };

    setBusy(true);
    setError(null);

    try {
      if (creating) {
        const id = form.id.trim().toLowerCase();
        if (!/^[a-z0-9-]+$/.test(id)) {
          setError('ID は小文字英数字とハイフンのみ使用できます');
          setBusy(false);
          return;
        }
        await onCreate({
          id,
          name,
          theme,
          isRestrictive: form.isRestrictive,
          blacklist,
          sortOrder: modeConfigs.length,
        });
      } else if (editingId) {
        await onUpdate(editingId, {
          name,
          theme,
          isRestrictive: form.isRestrictive,
          blacklist,
        });
      }

      setCreating(false);
      setEditingId(null);
    } catch {
      setError('保存に失敗しました');
    }

    setBusy(false);
  };

  const handleDelete = async (modeId: string) => {
    if (modeId === activeModeId) {
      setError('アクティブなモードは削除できません');
      return;
    }
    if (!window.confirm('このモードを削除しますか？関連タスク・ブックマークも削除されます。')) {
      return;
    }
    setBusy(true);
    setError(null);
    await onDelete(modeId);
    setBusy(false);
    if (editingId === modeId) {
      setEditingId(null);
      setCreating(false);
    }
  };

  const handleRestoreDefaults = async () => {
    if (
      !window.confirm(
        '仕事・学習・趣味の3モードを初期設定（名前・テーマ・ブラックリスト）に戻します。\n' +
          'カスタムモードとタスク・ブックマークはそのまま残ります。続行しますか？',
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onRestoreDefaults();
      setCreating(false);
      setEditingId(null);
    } catch {
      setError('初期モードの復元に失敗しました');
    }
    setBusy(false);
  };

  const showForm = creating || editingId !== null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mode-manager-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card mode-manager-card">
        <h2 id="mode-manager-title">モード管理</h2>
        <p className="muted">
          {modeConfigs.length}/{MAX_MODES} モード
        </p>

        <ul className="mode-config-list">
          {modeConfigs.map((mode) => (
            <li key={mode.id} className="mode-config-item">
              <div className="mode-config-info">
                <span
                  className="mode-color-dot"
                  style={{ background: mode.theme.accent }}
                  aria-hidden="true"
                />
                <span>
                  {mode.name}
                  {mode.id === activeModeId && (
                    <span className="active-tag">（使用中）</span>
                  )}
                </span>
                {mode.isRestrictive && (
                  <span className="restrictive-badge small">制限</span>
                )}
              </div>
              <div className="mode-config-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={disabled || busy}
                  onClick={() => startEdit(mode)}
                >
                  編集
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm danger-text"
                  disabled={disabled || busy || mode.id === activeModeId || modeConfigs.length <= 1}
                  onClick={() => void handleDelete(mode.id)}
                >
                  削除
                </button>
              </div>
            </li>
          ))}
        </ul>

        {!showForm && modeConfigs.length < MAX_MODES && (
          <button
            type="button"
            className="btn btn-secondary"
            disabled={disabled || busy}
            onClick={startCreate}
          >
            新規モードを追加
          </button>
        )}

        {!showForm && (
          <div className="mode-restore-section">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={disabled || busy}
              onClick={() => void handleRestoreDefaults()}
            >
              初期モードを復元
            </button>
            <p className="muted mode-restore-hint">
              仕事・学習・趣味を初期設定に戻します
            </p>
          </div>
        )}

        {error && !showForm && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        {showForm && (
          <form className="mode-form" onSubmit={(e) => void handleSubmit(e)}>
            <h3>{creating ? '新規モード' : 'モードを編集'}</h3>

            {creating && (
              <label className="field-row">
                <span>ID（slug）</span>
                <input
                  type="text"
                  value={form.id}
                  placeholder="例: deep-work"
                  pattern="[a-z0-9-]+"
                  required
                  disabled={busy}
                  onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                />
              </label>
            )}

            <label className="field-row">
              <span>表示名</span>
              <input
                type="text"
                value={form.name}
                maxLength={MAX_MODE_NAME_LENGTH}
                required
                disabled={busy}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>

            <label className="field-row">
              <span>アクセントカラー</span>
              <div className="color-picker">
                {PRESET_ACCENTS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`color-swatch${form.accent === color ? ' selected' : ''}`}
                    style={{ background: color }}
                    aria-label={`カラー ${color}`}
                    disabled={busy}
                    onClick={() => setForm((f) => ({ ...f, accent: color }))}
                  />
                ))}
              </div>
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={form.isRestrictive}
                disabled={busy}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isRestrictive: e.target.checked }))
                }
              />
              閲覧制限を有効にする
            </label>

            {form.isRestrictive && (
              <label className="field-row field-col">
                <span>ブラックリスト（1 行 1 ドメイン）</span>
                <textarea
                  value={form.blacklistText}
                  rows={5}
                  placeholder={'youtube.com\nx.com'}
                  disabled={busy}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, blacklistText: e.target.value }))
                  }
                />
              </label>
            )}

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busy}
                onClick={() => {
                  setCreating(false);
                  setEditingId(null);
                  setError(null);
                }}
              >
                キャンセル
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {creating ? '作成' : '保存'}
              </button>
            </div>
          </form>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
