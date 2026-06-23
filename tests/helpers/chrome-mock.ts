import { vi } from 'vitest';
import { storageToRecord } from '@/shared/migration';
import type { StorageSchema } from '@/shared/schemas';

let storageData: Record<string, unknown> = {};

export function seedStorage(data: StorageSchema): void {
  storageData = storageToRecord(data);
}

export function clearStorageMock(): void {
  storageData = {};
}

export function getStorageSnapshot(): Record<string, unknown> {
  return { ...storageData };
}

export function installChromeMocks(): void {
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: vi.fn(async () => ({ ...storageData })),
        set: vi.fn(async (data: Record<string, unknown>) => {
          storageData = { ...storageData, ...data };
        }),
      },
      session: {
        get: vi.fn(async () => ({})),
        set: vi.fn(async () => undefined),
        remove: vi.fn(async () => undefined),
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
      query: vi.fn(async () => []),
      create: vi.fn(),
      remove: vi.fn(),
      update: vi.fn(),
      onUpdated: { addListener: vi.fn() },
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
