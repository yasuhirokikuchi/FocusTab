import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultStorage } from '@/shared/seed/default-data';
import { seedStorage } from '../../../tests/helpers/chrome-mock';
import { handleImportData } from './handlers';
import { loadStorage } from './state';

describe('handleImportData', () => {
  beforeEach(() => {
    vi.mocked(chrome.declarativeNetRequest.updateDynamicRules).mockClear();
  });

  it('インポート後にアクティブモードの DNR ルールを同期する', async () => {
    seedStorage(createDefaultStorage());

    const imported = createDefaultStorage();
    imported.activeModeId = 'hobby';
    imported.modes = imported.modes.map((mode) =>
      mode.id === 'hobby'
        ? {
            ...mode,
            isRestrictive: true,
            blacklist: ['example.com', 'blocked.test'],
          }
        : mode,
    );

    await handleImportData(JSON.stringify(imported), true);

    const data = await loadStorage();
    expect(data.activeModeId).toBe('hobby');

    expect(chrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalled();
    const lastCall = vi.mocked(chrome.declarativeNetRequest.updateDynamicRules).mock
      .calls.at(-1)?.[0];
    expect(lastCall?.addRules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          condition: expect.objectContaining({ urlFilter: '||example.com^' }),
        }),
        expect.objectContaining({
          condition: expect.objectContaining({ urlFilter: '||blocked.test^' }),
        }),
      ]),
    );
    expect(lastCall?.addRules).toHaveLength(2);
  });

  it('非制限モードへインポートした場合は DNR ルールを空にする', async () => {
    seedStorage(createDefaultStorage());

    const imported = createDefaultStorage();
    imported.activeModeId = 'hobby';

    await handleImportData(JSON.stringify(imported), true);

    const lastCall = vi.mocked(chrome.declarativeNetRequest.updateDynamicRules).mock
      .calls.at(-1)?.[0];
    expect(lastCall?.addRules).toEqual([]);
  });
});
