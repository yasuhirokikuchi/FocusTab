import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultStorage } from '@/shared/seed/default-data';
import type { TabSnapshot } from '@/shared/schemas';
import { SESSION_KEYS } from '@/shared/storage-keys';
import {
  addMockTab,
  getMockTabs,
  getSessionSnapshot,
  queryTabs,
  restoreChromeTabMocks,
  seedStorage,
} from '../../../tests/helpers/chrome-mock';
import { switchMode } from './mode';
import { loadStorage } from './state';

const ISO = '2026-06-18T00:00:00.000Z';
const FOCUS_TAB_URL = 'chrome-extension://focustab-test/newtab.html';

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
  confirmModeSwitch?: boolean;
  studySnapshots?: TabSnapshot[];
  lockState?: ReturnType<typeof createDefaultStorage>['lockState'];
}) {
  const base = createDefaultStorage();
  seedStorage({
    ...base,
    lockState: overrides?.lockState ?? null,
    settings: {
      ...base.settings,
      confirmModeSwitch: overrides?.confirmModeSwitch ?? false,
    },
    tabSnapshots: {
      study: overrides?.studySnapshots ?? [studyRestoreSnapshot()],
    },
  });
}

function seedDefaultBrowserTabs() {
  addMockTab({
    url: FOCUS_TAB_URL,
    title: 'FocusTab',
    active: true,
  });
  addMockTab({
    url: 'https://github.com/focustab',
    title: 'GitHub',
    active: false,
  });
}

describe('switchMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    restoreChromeTabMocks();
    seedDefaultBrowserTabs();
  });

  it('正常切替 — 退避・スナップショット保存・activeModeId 更新・復元開始', async () => {
    seedSwitchableStorage();

    const before = await loadStorage();

    const result = await switchMode('study', { confirmed: true });

    expect(result.evacuatedTabCount).toBe(1);
    expect(result.restoreJobId).toBeTruthy();

    const after = await loadStorage();
    expect(after.activeModeId).toBe('study');
    expect(after.tabSnapshots.work).toHaveLength(1);
    expect(after.tabSnapshots.work[0]).toMatchObject({
      url: 'https://github.com/focustab',
      title: 'GitHub',
    });
    expect(before.tabSnapshots.work).toBeUndefined();

    expect(after.restoreProgress).toMatchObject({
      jobId: result.restoreJobId,
      modeId: 'study',
      total: 1,
      status: 'running',
    });

    expect(getSessionSnapshot()[SESSION_KEYS.RESTORE_QUEUE]).toBeTruthy();
    expect(getMockTabs().some((tab) => tab.url === 'https://github.com/focustab')).toBe(false);
    expect(vi.mocked(chrome.tabs.remove)).toHaveBeenCalled();
    expect(vi.mocked(chrome.declarativeNetRequest.updateDynamicRules)).toHaveBeenCalled();
  });

  it('ロック中は LOCKED で状態を変えない', async () => {
    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    seedSwitchableStorage({
      lockState: {
        lockedAt: new Date().toISOString(),
        expiresAt,
        durationMinutes: 15,
        modeIdAtLock: 'work',
      },
    });

    const before = await loadStorage();

    await expect(switchMode('study', { confirmed: true })).rejects.toMatchObject({
      code: 'LOCKED',
    });

    const after = await loadStorage();
    expect(after.activeModeId).toBe(before.activeModeId);
    expect(after.tabSnapshots).toEqual(before.tabSnapshots);
    expect(vi.mocked(chrome.tabs.remove)).not.toHaveBeenCalled();
  });

  it('確認未了は CONFIRMATION_REQUIRED', async () => {
    seedSwitchableStorage({ confirmModeSwitch: true });

    const before = await loadStorage();

    await expect(switchMode('study')).rejects.toMatchObject({
      code: 'CONFIRMATION_REQUIRED',
    });

    const after = await loadStorage();
    expect(after.activeModeId).toBe(before.activeModeId);
    expect(after.tabSnapshots).toEqual(before.tabSnapshots);
    expect(vi.mocked(chrome.tabs.remove)).not.toHaveBeenCalled();
  });

  it('同一モードは ALREADY_ACTIVE', async () => {
    seedSwitchableStorage();

    await expect(switchMode('work', { confirmed: true })).rejects.toMatchObject({
      code: 'ALREADY_ACTIVE',
    });

    const data = await loadStorage();
    expect(data.activeModeId).toBe('work');
    expect(vi.mocked(chrome.tabs.remove)).not.toHaveBeenCalled();
  });

  it('退避失敗時は TAB_OPERATION_FAILED で状態を変えない', async () => {
    seedSwitchableStorage();

    const before = await loadStorage();

    vi.mocked(chrome.tabs.query).mockImplementation(async (queryInfo) => {
      if (queryInfo?.windowId !== undefined) {
        throw new Error('tabs.query failed during evacuation');
      }
      return queryTabs(queryInfo ?? {});
    });

    await expect(switchMode('study', { confirmed: true })).rejects.toMatchObject({
      code: 'TAB_OPERATION_FAILED',
    });

    const after = await loadStorage();
    expect(after.activeModeId).toBe(before.activeModeId);
    expect(after.tabSnapshots).toEqual(before.tabSnapshots);
    expect(vi.mocked(chrome.declarativeNetRequest.updateDynamicRules)).not.toHaveBeenCalled();
  });
});
