import { vi } from 'vitest';
import { storageToRecord } from '@/shared/migration';
import type { StorageSchema } from '@/shared/schemas';

let storageData: Record<string, unknown> = {};
let sessionData: Record<string, unknown> = {};
let mockTabs: chrome.tabs.Tab[] = [];
let nextTabId = 1;
let mockWindows = new Map<number, { incognito: boolean }>();

export const MOCK_WINDOW_ID = 1;
export const MOCK_WINDOW_ID_2 = 2;

function ensureMockWindow(windowId: number, incognito = false): void {
  mockWindows.set(windowId, { incognito });
}

export function seedStorage(data: StorageSchema): void {
  storageData = storageToRecord(data);
}

export function clearStorageMock(): void {
  storageData = {};
  resetSessionMock();
  resetTabsMock();
}

export function getStorageSnapshot(): Record<string, unknown> {
  return { ...storageData };
}

export function getSessionSnapshot(): Record<string, unknown> {
  return { ...sessionData };
}

export function getMockTabs(): chrome.tabs.Tab[] {
  return [...mockTabs];
}

export function resetTabsMock(): void {
  mockTabs = [];
  nextTabId = 1;
  mockWindows = new Map([[MOCK_WINDOW_ID, { incognito: false }]]);
}

export function resetSessionMock(): void {
  sessionData = {};
}

export function addMockTab(partial: Partial<chrome.tabs.Tab> = {}): chrome.tabs.Tab {
  const windowId = partial.windowId ?? MOCK_WINDOW_ID;
  ensureMockWindow(windowId, partial.incognito ?? false);
  const tab = {
    id: nextTabId++,
    windowId,
    index: mockTabs.filter((t) => t.windowId === windowId).length,
    url: 'https://example.com',
    title: 'Tab',
    pinned: false,
    incognito: false,
    active: false,
    highlighted: false,
    selected: false,
    ...partial,
  } as chrome.tabs.Tab;
  mockTabs.push(tab);
  return tab;
}

export async function queryTabs(queryInfo: chrome.tabs.QueryInfo = {}): Promise<chrome.tabs.Tab[]> {
  let tabs = mockTabs.filter((t) => !t.incognito);

  if (queryInfo.windowId !== undefined) {
    tabs = tabs.filter((t) => t.windowId === queryInfo.windowId);
  }
  if (queryInfo.active) {
    tabs = tabs.filter((t) => t.active);
  }
  if (queryInfo.lastFocusedWindow) {
    tabs = tabs.filter((t) => t.active);
  }

  return tabs;
}

export async function getAllWindows(
  queryInfo: chrome.windows.QueryOptions = {},
): Promise<chrome.windows.Window[]> {
  let windows = [...mockWindows.entries()].map(([id, meta]) => ({
    id,
    incognito: meta.incognito,
    type: 'normal' as const,
  }));

  if (queryInfo.windowTypes?.length) {
    windows = windows.filter((w) => queryInfo.windowTypes!.includes(w.type));
  }

  return windows;
}

export async function getMockTab(tabId: number): Promise<chrome.tabs.Tab> {
  const tab = mockTabs.find((t) => t.id === tabId);
  if (!tab) {
    throw new Error(`Tab ${tabId} not found`);
  }
  return tab;
}

export function installChromeMocks(): void {
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: vi.fn(async (keys?: string | string[] | null) => {
          if (keys == null) {
            return { ...storageData };
          }
          if (typeof keys === 'string') {
            return { [keys]: storageData[keys] };
          }
          const result: Record<string, unknown> = {};
          for (const key of keys) {
            if (key in storageData) {
              result[key] = storageData[key];
            }
          }
          return result;
        }),
        set: vi.fn(async (data: Record<string, unknown>) => {
          storageData = { ...storageData, ...data };
        }),
      },
      session: {
        get: vi.fn(async (keys?: string | string[] | null) => {
          if (keys == null) {
            return { ...sessionData };
          }
          if (typeof keys === 'string') {
            return { [keys]: sessionData[keys] };
          }
          const result: Record<string, unknown> = {};
          for (const key of keys) {
            if (key in sessionData) {
              result[key] = sessionData[key];
            }
          }
          return result;
        }),
        set: vi.fn(async (items: Record<string, unknown>) => {
          sessionData = { ...sessionData, ...items };
        }),
        remove: vi.fn(async (keys: string | string[]) => {
          const list = Array.isArray(keys) ? keys : [keys];
          for (const key of list) {
            delete sessionData[key];
          }
        }),
      },
    },
    runtime: {
      getURL: vi.fn((path: string) => `chrome-extension://focustab-test/${path}`),
      sendMessage: vi.fn(),
      onMessage: { addListener: vi.fn() },
    },
    alarms: {
      create: vi.fn(),
      clear: vi.fn(),
      getAll: vi.fn(async () => []),
      onAlarm: { addListener: vi.fn() },
    },
    tabs: {
      query: vi.fn(queryTabs),
      get: vi.fn(getMockTab),
      create: vi.fn(async (createProperties: chrome.tabs.CreateProperties) =>
        addMockTab({
          url: createProperties.url,
          windowId: createProperties.windowId ?? MOCK_WINDOW_ID,
          pinned: createProperties.pinned ?? false,
          active: createProperties.active ?? false,
        }),
      ),
      remove: vi.fn(async (tabIds: number | number[]) => {
        const ids = new Set(Array.isArray(tabIds) ? tabIds : [tabIds]);
        mockTabs = mockTabs.filter((tab) => tab.id == null || !ids.has(tab.id));
      }),
      update: vi.fn(),
      onUpdated: { addListener: vi.fn() },
    },
    windows: {
      getAll: vi.fn(getAllWindows),
      getCurrent: vi.fn(async () => ({
        id: MOCK_WINDOW_ID,
        incognito: false,
        type: 'normal' as const,
      })),
    },
    declarativeNetRequest: {
      updateDynamicRules: vi.fn(async () => undefined),
      getDynamicRules: vi.fn(async () => []),
    },
    webNavigation: {
      onHistoryStateUpdated: { addListener: vi.fn() },
      onCommitted: { addListener: vi.fn() },
    },
  });
}

/** tabs API モックを既定実装に戻す（テスト内で mockRejectedValue 等を使った後） */
export function restoreChromeTabMocks(): void {
  vi.mocked(chrome.tabs.query).mockImplementation(queryTabs);
  vi.mocked(chrome.tabs.get).mockImplementation(getMockTab);
  vi.mocked(chrome.windows.getAll).mockImplementation(getAllWindows);
  vi.mocked(chrome.tabs.create).mockImplementation(
    async (createProperties: chrome.tabs.CreateProperties) =>
      addMockTab({
        url: createProperties.url,
        windowId: createProperties.windowId ?? MOCK_WINDOW_ID,
        pinned: createProperties.pinned ?? false,
        active: createProperties.active ?? false,
      }),
  );
  vi.mocked(chrome.tabs.remove).mockImplementation(async (tabIds: number | number[]) => {
    const ids = new Set(Array.isArray(tabIds) ? tabIds : [tabIds]);
    mockTabs = mockTabs.filter((tab) => tab.id == null || !ids.has(tab.id));
  });
}
