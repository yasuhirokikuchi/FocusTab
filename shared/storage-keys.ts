/** chrome.storage キー定数 */

export const STORAGE_KEYS = {
  SCHEMA_VERSION: 'schemaVersion',
  MODES: 'modes',
  ACTIVE_MODE_ID: 'activeModeId',
  TASKS: 'tasks',
  BOOKMARKS: 'bookmarks',
  LOCK_STATE: 'lockState',
  SETTINGS: 'settings',
  TAB_SNAPSHOTS: 'tabSnapshots',
  RESTORE_PROGRESS: 'restoreProgress',
} as const;

export const SESSION_KEYS = {
  RESTORE_QUEUE: 'restoreQueue',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
export type SessionKey = (typeof SESSION_KEYS)[keyof typeof SESSION_KEYS];
