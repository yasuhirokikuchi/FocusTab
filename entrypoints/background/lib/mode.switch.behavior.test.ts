import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultStorage } from '@/shared/seed/default-data';
import type { TabSnapshot } from '@/shared/schemas';
import { SESSION_KEYS } from '@/shared/storage-keys';
import {
  addMockTab,
  getMockTabs,
  getSessionSnapshot,
  MOCK_WINDOW_ID,
  MOCK_WINDOW_ID_2,
  queryTabs,
  resetTabsMock,
  restoreChromeTabMocks,
  seedStorage,
} from '../../../tests/helpers/chrome-mock';
import { resolveRestoreWindowId } from './tabs';
import { switchMode } from './mode';
import { loadStorage } from './state';

const ISO = '2026-06-18T00:00:00.000Z';
const FOCUS_TAB_URL = 'chrome-extension://focustab-test/newtab.html';
const MOCK_WINDOW_ID_3 = 3;
const MOCK_INCOGNITO_WINDOW_ID = 99;

function studyRestoreSnapshot(): TabSnapshot {
  return {
    url: 'https://example.com/study-restore',
    title: 'Study Tab',
    pinned: false,
    index: 0,
    savedAt: ISO,
  };
}

function seedSwitchableStorage(overrides?: {
  studySnapshots?: TabSnapshot[];
  workSnapshots?: TabSnapshot[];
}) {
  const base = createDefaultStorage();
  seedStorage({
    ...base,
    settings: { ...base.settings, confirmModeSwitch: false },
    tabSnapshots: {
      study: overrides?.studySnapshots ?? [studyRestoreSnapshot()],
      ...(overrides?.workSnapshots ? { work: overrides.workSnapshots } : {}),
    },
  });
}

describe('switchMode behavior matrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    restoreChromeTabMocks();
  });

  it('3ウィンドウ — すべての作業タブを退避する', async () => {
    resetTabsMock();
    seedSwitchableStorage();
    addMockTab({ url: FOCUS_TAB_URL, active: true, windowId: MOCK_WINDOW_ID });
    addMockTab({ url: 'https://win1.example.com', windowId: MOCK_WINDOW_ID });
    addMockTab({ url: 'https://win2.example.com', windowId: MOCK_WINDOW_ID_2 });
    addMockTab({ url: 'https://win3.example.com', windowId: MOCK_WINDOW_ID_3 });

    const result = await switchMode('study', {
      confirmed: true,
      senderWindowId: MOCK_WINDOW_ID,
    });

    expect(result.evacuatedTabCount).toBe(3);
    const after = await loadStorage();
    expect(after.tabSnapshots.work.map((s) => s.url)).toEqual(
      expect.arrayContaining([
        'https://win1.example.com',
        'https://win2.example.com',
        'https://win3.example.com',
      ]),
    );
  });

  it('復元先 — senderWindowId で指定したウィンドウに復元キューが作られる', async () => {
    resetTabsMock();
    seedSwitchableStorage();
    addMockTab({ url: FOCUS_TAB_URL, active: true, windowId: MOCK_WINDOW_ID_2 });
    addMockTab({ url: 'https://work.example.com', windowId: MOCK_WINDOW_ID_2 });

    await switchMode('study', {
      confirmed: true,
      senderWindowId: MOCK_WINDOW_ID_2,
    });

    const queue = getSessionSnapshot()[SESSION_KEYS.RESTORE_QUEUE] as {
      windowId: number;
    };
    expect(queue.windowId).toBe(MOCK_WINDOW_ID_2);
    const restored = getMockTabs().filter((t) => t.url === 'https://example.com/study-restore');
    expect(restored.every((t) => t.windowId === MOCK_WINDOW_ID_2)).toBe(true);
  });

  it('senderTabId — 送信元タブは退避対象から除外される', async () => {
    resetTabsMock();
    seedSwitchableStorage();
    const portal = addMockTab({
      url: FOCUS_TAB_URL,
      title: 'FocusTab',
      active: true,
      windowId: MOCK_WINDOW_ID,
    });
    addMockTab({ url: 'https://work.example.com', windowId: MOCK_WINDOW_ID });

    await switchMode('study', {
      confirmed: true,
      senderWindowId: MOCK_WINDOW_ID,
      senderTabId: portal.id,
    });

    expect(getMockTabs().some((t) => t.id === portal.id)).toBe(true);
    expect(getMockTabs().some((t) => t.url === 'https://work.example.com')).toBe(false);
  });

  it('副ウィンドウ — skipAnchorTab で FocusTab アンカーを作らない', async () => {
    resetTabsMock();
    seedSwitchableStorage();
    addMockTab({ url: FOCUS_TAB_URL, active: true, windowId: MOCK_WINDOW_ID });
    addMockTab({ url: 'https://work.example.com', windowId: MOCK_WINDOW_ID });
    addMockTab({ url: 'https://dragged.example.com', windowId: MOCK_WINDOW_ID_2 });

    await switchMode('study', {
      confirmed: true,
      senderWindowId: MOCK_WINDOW_ID,
    });

    const win2Tabs = getMockTabs().filter((t) => t.windowId === MOCK_WINDOW_ID_2);
    expect(win2Tabs).toHaveLength(0);
    const anchorInWin2 = getMockTabs().some(
      (t) => t.windowId === MOCK_WINDOW_ID_2 && t.url === FOCUS_TAB_URL,
    );
    expect(anchorInWin2).toBe(false);
  });

  it('シークレットウィンドウ — 退避対象外', async () => {
    resetTabsMock();
    seedSwitchableStorage();
    addMockTab({ url: FOCUS_TAB_URL, active: true, windowId: MOCK_WINDOW_ID });
    addMockTab({ url: 'https://normal.example.com', windowId: MOCK_WINDOW_ID });
    addMockTab({
      url: 'https://secret.example.com',
      windowId: MOCK_INCOGNITO_WINDOW_ID,
      incognito: true,
    });

    const result = await switchMode('study', {
      confirmed: true,
      senderWindowId: MOCK_WINDOW_ID,
    });

    expect(result.evacuatedTabCount).toBe(1);
    expect(getMockTabs().some((t) => t.url === 'https://secret.example.com')).toBe(true);
  });

  it('chrome:// タブ — 退避対象外', async () => {
    resetTabsMock();
    seedSwitchableStorage();
    addMockTab({ url: FOCUS_TAB_URL, active: true, windowId: MOCK_WINDOW_ID });
    addMockTab({ url: 'https://work.example.com', windowId: MOCK_WINDOW_ID });
    addMockTab({ url: 'chrome://settings', windowId: MOCK_WINDOW_ID });

    const result = await switchMode('study', {
      confirmed: true,
      senderWindowId: MOCK_WINDOW_ID,
    });

    expect(result.evacuatedTabCount).toBe(1);
    expect(getMockTabs().some((t) => t.url === 'chrome://settings')).toBe(true);
  });

  it('getAll がウィンドウを検出漏れしても tabs.query 経由で退避する', async () => {
    resetTabsMock();
    seedSwitchableStorage();
    addMockTab({ url: FOCUS_TAB_URL, active: true, windowId: MOCK_WINDOW_ID });
    addMockTab({ url: 'https://main.example.com', windowId: MOCK_WINDOW_ID });
    addMockTab({ url: 'https://dragged.example.com', windowId: MOCK_WINDOW_ID_2 });

    vi.mocked(chrome.windows.getAll).mockResolvedValue([
      { id: MOCK_WINDOW_ID, incognito: false, type: 'normal' },
    ] as chrome.windows.Window[]);

    const result = await switchMode('study', {
      confirmed: true,
      senderWindowId: MOCK_WINDOW_ID,
    });

    expect(result.evacuatedTabCount).toBe(2);
    const after = await loadStorage();
    expect(after.tabSnapshots.work.map((s) => s.url)).toEqual(
      expect.arrayContaining(['https://main.example.com', 'https://dragged.example.com']),
    );
  });

  it('clientTabRefs で SW の query 漏れを補完して退避する', async () => {
    resetTabsMock();
    seedSwitchableStorage();
    const portal = addMockTab({
      url: FOCUS_TAB_URL,
      active: true,
      windowId: MOCK_WINDOW_ID,
    });
    addMockTab({ url: 'https://main.example.com', windowId: MOCK_WINDOW_ID });
    const dragged = addMockTab({
      url: 'https://dragged.example.com',
      windowId: MOCK_WINDOW_ID_2,
    });

    vi.mocked(chrome.tabs.query).mockImplementation(async (queryInfo) => {
      if (!queryInfo || Object.keys(queryInfo).length === 0) {
        return queryTabs({ windowId: MOCK_WINDOW_ID });
      }
      return queryTabs(queryInfo);
    });

    const result = await switchMode('study', {
      confirmed: true,
      senderWindowId: MOCK_WINDOW_ID,
      senderTabId: portal.id,
      clientTabRefs: [
        { tabId: portal.id!, windowId: MOCK_WINDOW_ID },
        { tabId: dragged.id!, windowId: MOCK_WINDOW_ID_2 },
      ],
    });

    expect(result.evacuatedTabCount).toBe(1);
    const after = await loadStorage();
    expect(after.tabSnapshots.work.map((s) => s.url)).toContain('https://dragged.example.com');
  });

  it('退避あり — 既存スナップショットは新しい退避結果で置き換える', async () => {
    const oldWork: TabSnapshot[] = [
      {
        url: 'https://old.example.com',
        title: 'Old',
        pinned: false,
        index: 0,
        savedAt: ISO,
      },
    ];

    resetTabsMock();
    seedSwitchableStorage({ workSnapshots: oldWork });
    addMockTab({ url: FOCUS_TAB_URL, active: true, windowId: MOCK_WINDOW_ID });
    addMockTab({ url: 'https://new.example.com', windowId: MOCK_WINDOW_ID });

    await switchMode('study', {
      confirmed: true,
      senderWindowId: MOCK_WINDOW_ID,
    });

    const after = await loadStorage();
    expect(after.tabSnapshots.work).toHaveLength(1);
    expect(after.tabSnapshots.work[0].url).toBe('https://new.example.com');
  });
});

describe('resolveRestoreWindowId', () => {
  beforeEach(() => {
    restoreChromeTabMocks();
    resetTabsMock();
  });

  it('senderWindowId を最優先する', async () => {
    addMockTab({ url: FOCUS_TAB_URL, active: true, windowId: MOCK_WINDOW_ID });
    const id = await resolveRestoreWindowId({ senderWindowId: MOCK_WINDOW_ID_2 });
    expect(id).toBe(MOCK_WINDOW_ID_2);
  });

  it('senderTabId からウィンドウを解決する', async () => {
    const tab = addMockTab({
      url: FOCUS_TAB_URL,
      active: true,
      windowId: MOCK_WINDOW_ID_2,
    });
    const id = await resolveRestoreWindowId({ senderTabId: tab.id });
    expect(id).toBe(MOCK_WINDOW_ID_2);
  });
});
