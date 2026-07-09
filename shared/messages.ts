import type {
  Bookmark,
  LockState,
  Mode,
  ModeSummary,
  RestoreProgress,
  SettingsSummary,
  TabSnapshot,
  Task,
} from './schemas';

/** すべての Background 応答の共通形式 */
export interface MessageResponse<T = unknown> {
  ok: boolean;
  error?: MessageError;
  data?: T;
}

export interface MessageError {
  code: ErrorCode;
  message: string;
}

export type ErrorCode =
  | 'LOCKED'
  | 'INVALID_MODE'
  | 'ALREADY_ACTIVE'
  | 'CONFIRMATION_REQUIRED'
  | 'TAB_OPERATION_FAILED'
  | 'PENALTY_FAILED'
  | 'PERMISSION_DENIED'
  | 'INTERNAL';

/** GET_STATE 応答 */
export interface AppState {
  activeModeId: string;
  activeMode: ModeSummary;
  modes: ModeSummary[];
  /** モード管理 UI 用（blacklist 等を含む完全設定） */
  modeConfigs: Mode[];
  tasks: Task[];
  archivedTasks: Task[];
  bookmarks: Bookmark[];
  lockState: LockState | null;
  restoreProgress: RestoreProgress | null;
  settings: SettingsSummary;
}

export interface PingMessage {
  type: 'PING';
}

export interface GetStateMessage {
  type: 'GET_STATE';
}

export interface ModeSwitchMessage {
  type: 'MODE_SWITCH';
  targetModeId: string;
  confirmed?: boolean;
  /** ポップアップなど sender.tab がない場合の復元先ウィンドウ */
  senderWindowId?: number;
  /** UI 側で収集した全タブ参照（SW の query 漏れ対策） */
  clientTabRefs?: import('./evacuation-windows').ClientTabRef[];
}

export interface ModeSwitchResponse {
  restoreJobId: string;
  evacuatedTabCount: number;
}

export interface ModeCreateMessage {
  type: 'MODE_CREATE';
  mode: {
    id: string;
    name: string;
    theme: ModeSummary['theme'];
    isRestrictive: boolean;
    blacklist: string[];
    sortOrder: number;
  };
}

export interface ModeUpdateMessage {
  type: 'MODE_UPDATE';
  modeId: string;
  patch: Partial<{
    name: string;
    theme: ModeSummary['theme'];
    isRestrictive: boolean;
    blacklist: string[];
    sortOrder: number;
  }>;
}

export interface ModeDeleteMessage {
  type: 'MODE_DELETE';
  modeId: string;
}

export interface ModeRestoreDefaultsMessage {
  type: 'MODE_RESTORE_DEFAULTS';
  confirmed?: boolean;
}

export interface LockModeMessage {
  type: 'LOCK_MODE';
  durationMinutes: number;
}

export interface UnlockModeMessage {
  type: 'UNLOCK_MODE';
}

export interface EmergencyUnlockMessage {
  type: 'EMERGENCY_UNLOCK';
  penaltyText: string;
}

export interface TaskCreateMessage {
  type: 'TASK_CREATE';
  modeId: string;
  text: string;
}

export interface TaskUpdateMessage {
  type: 'TASK_UPDATE';
  taskId: string;
  patch: Partial<{ text: string; completed: boolean; sortOrder: number }>;
}

export interface TaskToggleMessage {
  type: 'TASK_TOGGLE';
  taskId: string;
}

export interface TaskDeleteMessage {
  type: 'TASK_DELETE';
  taskId: string;
}

export interface TaskReorderMessage {
  type: 'TASK_REORDER';
  modeId: string;
  taskIds: string[];
}

export interface TaskArchiveMessage {
  type: 'TASK_ARCHIVE';
  taskId: string;
}

export interface TaskUnarchiveMessage {
  type: 'TASK_UNARCHIVE';
  taskId: string;
}

export interface TaskDeleteArchivedMessage {
  type: 'TASK_DELETE_ARCHIVED';
  modeId: string;
}

export interface TaskDeleteArchivedResponse {
  deletedCount: number;
}

export interface BookmarkCreateMessage {
  type: 'BOOKMARK_CREATE';
  modeId: string;
  url: string;
  title: string;
}

export interface BookmarkUpdateMessage {
  type: 'BOOKMARK_UPDATE';
  bookmarkId: string;
  patch: Partial<{ url: string; title: string; sortOrder: number }>;
}

export interface BookmarkDeleteMessage {
  type: 'BOOKMARK_DELETE';
  bookmarkId: string;
}

export interface BookmarkReorderMessage {
  type: 'BOOKMARK_REORDER';
  modeId: string;
  bookmarkIds: string[];
}

export interface SettingsUpdateMessage {
  type: 'SETTINGS_UPDATE';
  patch: Partial<{
    confirmModeSwitch: boolean;
    restoreBatchSize: number;
    onboardingCompleted: boolean;
    showRestoreProgress: boolean;
    colorScheme: SettingsSummary['colorScheme'];
  }>;
}

export interface ExportDataMessage {
  type: 'EXPORT_DATA';
}

export interface ExportDataResponse {
  json: string;
  exportedAt: string;
  schemaVersion: number;
}

export interface ImportDataMessage {
  type: 'IMPORT_DATA';
  json: string;
  confirmed: boolean;
}

export interface DnrRuleStats {
  dynamicRuleCount: number;
  managedRuleCount: number;
  /** Chrome MV3 の unsafe 動的ルール上限 */
  unsafeLimit: number;
}

export interface GetDnrStatsMessage {
  type: 'GET_DNR_STATS';
}

export interface GetRestoreProgressMessage {
  type: 'GET_RESTORE_PROGRESS';
  jobId?: string;
}

export interface TabSnapshotListMessage {
  type: 'TAB_SNAPSHOT_LIST';
  modeId: string;
}

export interface TabSnapshotListResponse {
  modeId: string;
  snapshots: TabSnapshot[];
}

export interface TabSnapshotRemoveMessage {
  type: 'TAB_SNAPSHOT_REMOVE';
  modeId: string;
  index: number;
}

export interface TabSnapshotClearMessage {
  type: 'TAB_SNAPSHOT_CLEAR';
  modeId: string;
  confirmed?: boolean;
}

export interface TabSnapshotClearResponse {
  clearedCount: number;
}

export type IncomingMessage =
  | PingMessage
  | GetStateMessage
  | ModeSwitchMessage
  | ModeCreateMessage
  | ModeUpdateMessage
  | ModeDeleteMessage
  | ModeRestoreDefaultsMessage
  | LockModeMessage
  | UnlockModeMessage
  | EmergencyUnlockMessage
  | TaskCreateMessage
  | TaskUpdateMessage
  | TaskToggleMessage
  | TaskDeleteMessage
  | TaskReorderMessage
  | TaskArchiveMessage
  | TaskUnarchiveMessage
  | TaskDeleteArchivedMessage
  | BookmarkCreateMessage
  | BookmarkUpdateMessage
  | BookmarkDeleteMessage
  | BookmarkReorderMessage
  | SettingsUpdateMessage
  | ExportDataMessage
  | ImportDataMessage
  | GetDnrStatsMessage
  | GetRestoreProgressMessage
  | TabSnapshotListMessage
  | TabSnapshotRemoveMessage
  | TabSnapshotClearMessage;

export function isIncomingMessage(msg: unknown): msg is IncomingMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'type' in msg &&
    typeof (msg as IncomingMessage).type === 'string'
  );
}
