/** FocusTab 共有定数 */

export const CURRENT_SCHEMA_VERSION = 1;

export const ALARM_NAMES = {
  MODE_LOCK_EXPIRY: 'mode-lock-expiry',
} as const;

export const RESTORE_BATCH_SIZE = 3;
export const RESTORE_BATCH_DELAY_MS = 300;
export const RESTORE_BATCH_SIZE_MIN = 1;
export const RESTORE_BATCH_SIZE_MAX = 5;

export const MAX_MODES = 10;
export const MAX_BOOKMARKS_PER_MODE = 50;
export const MAX_TASKS_PER_MODE = 100;
export const MAX_TABS_PER_SNAPSHOT = 30;
export const MAX_BLACKLIST_DOMAINS = 200;
export const MAX_TASK_TEXT_LENGTH = 500;
export const MAX_BOOKMARK_TITLE_LENGTH = 200;
export const MAX_MODE_NAME_LENGTH = 50;

export const LOCK_DURATION_MIN = 1;
export const LOCK_DURATION_MAX = 480;

/** NFR: 固定ペナルティ解除文（ユーザー編集不可） */
export const PENALTY_TEXT =
  '集中を中断すると今日の目標が遠のきます。本当に解除しますか？';

export const DEFAULT_MODE_IDS = ['work', 'study', 'hobby'] as const;
