import { useEffect, useState, type CSSProperties } from 'react';
import { sendCommand } from '@/shared/messaging';
import { collectClientTabRefs } from '@/shared/evacuation-windows';
import type {
  AppState,
  ModeSwitchResponse,
  TabSnapshotClearResponse,
  TabSnapshotListResponse,
  TaskDeleteArchivedResponse,
} from '@/shared/messages';
import type { TabSnapshot } from '@/shared/schemas';
import type { Mode, SettingsSummary } from '@/shared/schemas';
import { BookmarkList } from './components/BookmarkList';
import { LockPanel } from './components/LockPanel';
import { ModeManager } from './components/ModeManager';
import { ModeSwitcher } from './components/ModeSwitcher';
import { OnboardingModal } from './components/OnboardingModal';
import { SettingsPanel } from './components/SettingsPanel';
import { TaskList } from './components/TaskList';
import { useAppState } from './hooks/useAppState';
import { useColorScheme } from './hooks/useColorScheme';
import './style.css';

export default function App() {
  const { state, error, loading, refresh, setError } = useAppState();
  const [switching, setSwitching] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showModeManager, setShowModeManager] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('settings') === '1') {
      setShowSettings(true);
    }
  }, []);

  const handleSwitch = async (targetModeId: string) => {
    if (!state || state.lockState) return;

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
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const clientTabRefs = await collectClientTabRefs();
    const res = await sendCommand<ModeSwitchResponse>({
      type: 'MODE_SWITCH',
      targetModeId,
      confirmed: true,
      senderWindowId: currentTab?.windowId,
      clientTabRefs,
    });
    setSwitching(false);

    if (!res.ok) {
      setError(res.error?.message ?? 'モード切替に失敗しました');
      return;
    }
    await refresh();
  };

  const handleTaskAdd = async (text: string) => {
    if (!state) return;
    const res = await sendCommand({ type: 'TASK_CREATE', modeId: state.activeModeId, text });
    if (!res.ok) {
      setError(res.error?.message ?? 'タスクの追加に失敗しました');
      return;
    }
    await refresh();
  };

  const handleTaskToggle = async (taskId: string) => {
    const res = await sendCommand({ type: 'TASK_TOGGLE', taskId });
    if (!res.ok) {
      setError(res.error?.message ?? 'タスクの更新に失敗しました');
      return;
    }
    await refresh();
  };

  const handleTaskUpdate = async (taskId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const res = await sendCommand({
      type: 'TASK_UPDATE',
      taskId,
      patch: { text: trimmed },
    });
    if (!res.ok) {
      setError(res.error?.message ?? 'タスクの編集に失敗しました');
      return;
    }
    await refresh();
  };

  const handleTaskDelete = async (taskId: string) => {
    const res = await sendCommand({ type: 'TASK_DELETE', taskId });
    if (!res.ok) {
      setError(res.error?.message ?? 'タスクの削除に失敗しました');
      return;
    }
    await refresh();
  };

  const handleTaskReorder = async (taskIds: string[]) => {
    if (!state) return;
    const res = await sendCommand({
      type: 'TASK_REORDER',
      modeId: state.activeModeId,
      taskIds,
    });
    if (!res.ok) {
      setError(res.error?.message ?? 'タスクの並び替えに失敗しました');
      return;
    }
    await refresh();
  };

  const handleTaskArchive = async (taskId: string) => {
    const res = await sendCommand({ type: 'TASK_ARCHIVE', taskId });
    if (!res.ok) {
      setError(res.error?.message ?? 'タスクのアーカイブに失敗しました');
      return;
    }
    await refresh();
  };

  const handleTaskUnarchive = async (taskId: string) => {
    const res = await sendCommand({ type: 'TASK_UNARCHIVE', taskId });
    if (!res.ok) {
      setError(res.error?.message ?? 'タスクの復元に失敗しました');
      return;
    }
    await refresh();
  };

  const handleTaskDeleteAllArchived = async () => {
    if (!state || state.archivedTasks.length === 0) return;

    const count = state.archivedTasks.length;
    if (
      !window.confirm(
        `アーカイブ済みタスク ${count} 件をすべて削除します。\nこの操作は元に戻せません。続行しますか？`,
      )
    ) {
      return;
    }

    const res = await sendCommand<TaskDeleteArchivedResponse>({
      type: 'TASK_DELETE_ARCHIVED',
      modeId: state.activeModeId,
    });
    if (!res.ok) {
      setError(res.error?.message ?? 'アーカイブタスクの一括削除に失敗しました');
      return;
    }
    await refresh();
  };

  const handleBookmarkAdd = async (url: string, title: string) => {
    if (!state) return;
    const res = await sendCommand({
      type: 'BOOKMARK_CREATE',
      modeId: state.activeModeId,
      url,
      title,
    });
    if (!res.ok) {
      setError(res.error?.message ?? 'ブックマークの追加に失敗しました');
      return;
    }
    await refresh();
  };

  const handleBookmarkUpdate = async (bookmarkId: string, url: string, title: string) => {
    const res = await sendCommand({
      type: 'BOOKMARK_UPDATE',
      bookmarkId,
      patch: { url, title },
    });
    if (!res.ok) {
      setError(res.error?.message ?? 'ブックマークの編集に失敗しました');
      return;
    }
    await refresh();
  };

  const handleBookmarkDelete = async (bookmarkId: string) => {
    const res = await sendCommand({ type: 'BOOKMARK_DELETE', bookmarkId });
    if (!res.ok) {
      setError(res.error?.message ?? 'ブックマークの削除に失敗しました');
      return;
    }
    await refresh();
  };

  const handleBookmarkReorder = async (bookmarkIds: string[]) => {
    if (!state) return;
    const res = await sendCommand({
      type: 'BOOKMARK_REORDER',
      modeId: state.activeModeId,
      bookmarkIds,
    });
    if (!res.ok) {
      setError(res.error?.message ?? 'ブックマークの並び替えに失敗しました');
      return;
    }
    await refresh();
  };

  const handleLock = async (durationMinutes: number) => {
    const res = await sendCommand({ type: 'LOCK_MODE', durationMinutes });
    if (!res.ok) {
      setError(res.error?.message ?? 'ロックに失敗しました');
      return;
    }
    await refresh();
  };

  const handleSettingsUpdate = async (patch: Partial<SettingsSummary>) => {
    const res = await sendCommand({ type: 'SETTINGS_UPDATE', patch });
    if (!res.ok) {
      setError(res.error?.message ?? '設定の保存に失敗しました');
      return;
    }
    await refresh();
  };

  const handleOnboardingComplete = async () => {
    await handleSettingsUpdate({ onboardingCompleted: true });
  };

  const handleModeCreate = async (mode: {
    id: string;
    name: string;
    theme: Mode['theme'];
    isRestrictive: boolean;
    blacklist: string[];
    sortOrder: number;
  }) => {
    const res = await sendCommand({ type: 'MODE_CREATE', mode });
    if (!res.ok) {
      setError(res.error?.message ?? 'モードの作成に失敗しました');
      throw new Error('create failed');
    }
    await refresh();
  };

  const handleModeUpdate = async (
    modeId: string,
    patch: Partial<{
      name: string;
      theme: Mode['theme'];
      isRestrictive: boolean;
      blacklist: string[];
    }>,
  ) => {
    const res = await sendCommand({ type: 'MODE_UPDATE', modeId, patch });
    if (!res.ok) {
      setError(res.error?.message ?? 'モードの更新に失敗しました');
      throw new Error('update failed');
    }
    await refresh();
  };

  const handleModeDelete = async (modeId: string) => {
    const res = await sendCommand({ type: 'MODE_DELETE', modeId });
    if (!res.ok) {
      setError(res.error?.message ?? 'モードの削除に失敗しました');
      return;
    }
    await refresh();
  };

  const handleModeRestoreDefaults = async () => {
    const res = await sendCommand({ type: 'MODE_RESTORE_DEFAULTS', confirmed: true });
    if (!res.ok) {
      setError(res.error?.message ?? '初期モードの復元に失敗しました');
      throw new Error('restore failed');
    }
    await refresh();
  };

  const handleTabSnapshotList = async (modeId: string): Promise<TabSnapshot[] | null> => {
    const res = await sendCommand<TabSnapshotListResponse>({
      type: 'TAB_SNAPSHOT_LIST',
      modeId,
    });
    if (!res.ok || !res.data) {
      return null;
    }
    return res.data.snapshots;
  };

  const handleTabSnapshotRemove = async (modeId: string, index: number): Promise<boolean> => {
    const res = await sendCommand({ type: 'TAB_SNAPSHOT_REMOVE', modeId, index });
    return res.ok;
  };

  const handleTabSnapshotClear = async (modeId: string): Promise<boolean> => {
    const res = await sendCommand<TabSnapshotClearResponse>({
      type: 'TAB_SNAPSHOT_CLEAR',
      modeId,
      confirmed: true,
    });
    return res.ok;
  };

  const modeId = state?.activeModeId ?? 'work';
  const locked = Boolean(state?.lockState);
  const progress = state?.restoreProgress;
  const theme = state?.activeMode.theme;
  const resolvedColorScheme = useColorScheme(state?.settings.colorScheme ?? 'dark');

  const portalStyle = theme
    ? ({
        '--ft-accent': theme.accent,
      } as CSSProperties)
    : undefined;

  return (
    <div
      className="portal"
      data-mode={modeId}
      data-color-scheme={resolvedColorScheme}
      style={portalStyle}
    >
      <header className="portal-header">
        <div className="header-row">
          <h1>FocusTab</h1>
          {state && (
            <div className="header-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={switching}
                aria-label="モード管理"
                onClick={() => setShowModeManager(true)}
              >
                モード管理
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={switching}
                aria-label="設定"
                onClick={() => setShowSettings(true)}
              >
                設定
              </button>
            </div>
          )}
        </div>
        {state && (
          <p className="mode-label">
            現在: <strong>{state.activeMode.name}</strong>
            {state.activeMode.isRestrictive && (
              <span className="restrictive-badge" title="閲覧制限あり">
                制限中
              </span>
            )}
          </p>
        )}
      </header>

      {error && (
        <div className="error-banner" role="alert">
          {error}
          <button
            type="button"
            className="btn-icon"
            aria-label="エラーを閉じる"
            onClick={() => setError(null)}
          >
            ×
          </button>
        </div>
      )}

      {state?.settings.showRestoreProgress && progress?.status === 'running' && (
        <div className="progress-banner" role="status" aria-live="polite">
          タブ復元中… {progress.completed}/{progress.total}
        </div>
      )}

      {loading && !state ? (
        <p className="loading">読み込み中…</p>
      ) : state ? (
        <>
          <ModeSwitcher
            modes={state.modes}
            activeModeId={state.activeModeId}
            locked={locked}
            switching={switching}
            onSwitch={(id) => void handleSwitch(id)}
          />

          <main className="portal-main">
            <TaskList
              tasks={state.tasks}
              archivedTasks={state.archivedTasks}
              disabled={switching}
              onAdd={handleTaskAdd}
              onToggle={handleTaskToggle}
              onUpdate={handleTaskUpdate}
              onDelete={handleTaskDelete}
              onReorder={handleTaskReorder}
              onArchive={handleTaskArchive}
              onUnarchive={handleTaskUnarchive}
              onDeleteAllArchived={handleTaskDeleteAllArchived}
            />
            <aside className="portal-sidebar">
              <BookmarkList
                bookmarks={state.bookmarks}
                disabled={switching}
                onAdd={handleBookmarkAdd}
                onUpdate={handleBookmarkUpdate}
                onDelete={handleBookmarkDelete}
                onReorder={handleBookmarkReorder}
              />
              <LockPanel
                lockState={state.lockState}
                disabled={switching}
                onLock={handleLock}
              />
            </aside>
          </main>
        </>
      ) : null}

      {state && !state.settings.onboardingCompleted && (
        <OnboardingModal onComplete={handleOnboardingComplete} />
      )}

      {showSettings && state && (
        <SettingsPanel
          settings={state.settings}
          disabled={switching}
          onUpdate={handleSettingsUpdate}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showModeManager && state && (
        <ModeManager
          modeConfigs={state.modeConfigs}
          activeModeId={state.activeModeId}
          disabled={switching || locked}
          onCreate={handleModeCreate}
          onUpdate={handleModeUpdate}
          onDelete={handleModeDelete}
          onRestoreDefaults={handleModeRestoreDefaults}
          onTabSnapshotList={handleTabSnapshotList}
          onTabSnapshotRemove={handleTabSnapshotRemove}
          onTabSnapshotClear={handleTabSnapshotClear}
          onClose={() => setShowModeManager(false)}
        />
      )}
    </div>
  );
}
