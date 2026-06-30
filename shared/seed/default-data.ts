import type {
  Bookmark,
  Mode,
  Settings,
  StorageSchema,
  Task,
} from '../schemas';
import { CURRENT_SCHEMA_VERSION } from '../constants';

const ISO = '2026-06-18T00:00:00.000Z';

export const defaultModes: Mode[] = [
  {
    id: 'work',
    name: '仕事',
    theme: { accent: '#3b82f6', bg: '#1a1f2e', text: '#e2e8f0' },
    isRestrictive: true,
    blacklist: [
      'youtube.com',
      'twitter.com',
      'x.com',
      'instagram.com',
      'tiktok.com',
      'reddit.com',
      'netflix.com',
    ],
    sortOrder: 0,
    createdAt: ISO,
    updatedAt: ISO,
  },
  {
    id: 'study',
    name: '学習',
    theme: { accent: '#10b981', bg: '#0f172a', text: '#e2e8f0' },
    isRestrictive: true,
    blacklist: [
      'youtube.com',
      'twitter.com',
      'x.com',
      'instagram.com',
      'tiktok.com',
      'reddit.com',
    ],
    sortOrder: 1,
    createdAt: ISO,
    updatedAt: ISO,
  },
  {
    id: 'hobby',
    name: '趣味',
    theme: { accent: '#f59e0b', bg: '#1c1917', text: '#fafaf9' },
    isRestrictive: false,
    blacklist: [],
    sortOrder: 2,
    createdAt: ISO,
    updatedAt: ISO,
  },
];

export const defaultTasks: Task[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    modeId: 'work',
    text: '今日の最優先タスクを1つ決める',
    completed: false,
    sortOrder: 0,
    createdAt: ISO,
    updatedAt: ISO,
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    modeId: 'study',
    text: '25分間の集中セッションを開始する',
    completed: false,
    sortOrder: 0,
    createdAt: ISO,
    updatedAt: ISO,
  },
];

export const defaultBookmarks: Bookmark[] = [
  {
    id: '00000000-0000-4000-8000-000000000010',
    modeId: 'work',
    url: 'https://github.com',
    title: 'GitHub',
    sortOrder: 0,
    createdAt: ISO,
  },
  {
    id: '00000000-0000-4000-8000-000000000011',
    modeId: 'study',
    url: 'https://developer.mozilla.org',
    title: 'MDN',
    sortOrder: 0,
    createdAt: ISO,
  },
];

export const defaultSettings: Settings = {
  confirmModeSwitch: true,
  restoreBatchSize: 3,
  onboardingCompleted: false,
  showRestoreProgress: true,
};

/** 新規インストール時の完全初期状態 */
export function createDefaultStorage(): StorageSchema {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    modes: defaultModes,
    activeModeId: 'work',
    tasks: defaultTasks,
    bookmarks: defaultBookmarks,
    lockState: null,
    settings: defaultSettings,
    tabSnapshots: {},
    restoreProgress: null,
  };
}
