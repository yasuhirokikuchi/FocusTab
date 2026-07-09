import { CURRENT_SCHEMA_VERSION, DEFAULT_MODE_IDS, MAX_MODES } from '@/shared/constants';
import { FocusTabError } from './errors';
import type { Mode, ModeInput, StorageSchema } from '@/shared/schemas';
import { modeInputSchema, modeSchema } from '@/shared/schemas';
import { defaultModes } from '@/shared/seed/default-data';
import { applyRulesForMode } from './blocking';
import { assertNotLocked } from './lock';
import { loadStorage, saveStorage, updateStorage } from './state';
import {
  buildModeSnapshot,
  evacuateAllWindows,
  resolveRestoreWindowId,
  restoreEvacuatedTabs,
  startRestore,
} from './tabs';

let switchInFlight = false;

export async function getActiveMode(): Promise<Mode> {
  const data = await loadStorage();
  const mode = data.modes.find((m) => m.id === data.activeModeId);
  if (!mode) {
    throw new FocusTabError('INTERNAL', 'アクティブモードが見つかりません');
  }
  return mode;
}

export async function switchMode(
  targetModeId: string,
  options?: {
    confirmed?: boolean;
    senderTabId?: number;
    senderWindowId?: number;
    clientTabRefs?: import('@/shared/evacuation-windows').ClientTabRef[];
  },
): Promise<{ restoreJobId: string; evacuatedTabCount: number }> {
  if (switchInFlight) {
    throw new FocusTabError('INTERNAL', 'モード切替処理中です。しばらくお待ちください');
  }

  switchInFlight = true;
  try {
    const data = await loadStorage();

    await assertNotLocked();

    const targetMode = data.modes.find((m) => m.id === targetModeId);
    if (!targetMode) {
      throw new FocusTabError('INVALID_MODE', '指定されたモードが存在しません');
    }

    if (data.activeModeId === targetModeId) {
      throw new FocusTabError('ALREADY_ACTIVE', 'すでにそのモードです');
    }

    if (data.settings.confirmModeSwitch && !options?.confirmed) {
      throw new FocusTabError(
        'CONFIRMATION_REQUIRED',
        'モード切替の確認が必要です',
      );
    }

    const previousModeId = data.activeModeId;
    const previousMode = data.modes.find((m) => m.id === previousModeId);
    if (!previousMode) {
      throw new FocusTabError('INTERNAL', '現在のモードが見つかりません');
    }

    const windowId = await resolveRestoreWindowId({
      senderWindowId: options?.senderWindowId,
      senderTabId: options?.senderTabId,
    });

    // Phase B: 退避（現モードのスナップショット保存 + タブ閉じ）
    let evacuated: Awaited<ReturnType<typeof evacuateAllWindows>>;
    try {
      evacuated = await evacuateAllWindows(windowId, {
        keepTabId: options?.senderTabId,
        clientTabRefs: options?.clientTabRefs,
      });
    } catch (err) {
      console.error('[FocusTab] evacuateAllWindows failed', err);
      throw new FocusTabError('TAB_OPERATION_FAILED', 'タブの退避に失敗しました');
    }

    const tabSnapshots = {
      ...data.tabSnapshots,
      [previousModeId]: buildModeSnapshot(evacuated, data.tabSnapshots[previousModeId]),
    };

    // Phase C: DNR 更新
    try {
      await applyRulesForMode(targetMode);
    } catch {
      await restoreEvacuatedTabs(evacuated, windowId);
      throw new FocusTabError('INTERNAL', '閲覧制限ルールの更新に失敗しました');
    }

    // Phase D: activeModeId 更新
    let updatedData: StorageSchema;
    try {
      updatedData = await updateStorage((current) => ({
        ...current,
        tabSnapshots,
        activeModeId: targetModeId,
        restoreProgress: null,
      }));
    } catch {
      await applyRulesForMode(previousMode);
      await restoreEvacuatedTabs(evacuated, windowId);
      throw new FocusTabError('INTERNAL', 'モード状態の保存に失敗しました');
    }

    // Phase E: 復元（失敗してもモード切替は維持）
    const toRestore = updatedData.tabSnapshots[targetModeId] ?? [];
    let restoreJobId: string;
    try {
      restoreJobId = await startRestore(toRestore, targetModeId, windowId);
    } catch {
      restoreJobId = crypto.randomUUID();
      await updateStorage((current) => ({
        ...current,
        restoreProgress: {
          jobId: restoreJobId,
          modeId: targetModeId,
          total: toRestore.length,
          completed: 0,
          status: 'failed',
          error: 'タブ復元の開始に失敗しました',
        },
      }));
    }

    return { restoreJobId, evacuatedTabCount: evacuated.length };
  } finally {
    switchInFlight = false;
  }
}

export async function createMode(input: ModeInput): Promise<Mode> {
  const parsed = modeInputSchema.parse(input);
  const now = new Date().toISOString();
  const mode = modeSchema.parse({
    ...parsed,
    createdAt: now,
    updatedAt: now,
  });

  await updateStorage((current) => {
    if (current.modes.length >= MAX_MODES) {
      throw new FocusTabError('INTERNAL', `モードは最大 ${MAX_MODES} 件です`);
    }
    if (current.modes.some((m) => m.id === mode.id)) {
      throw new FocusTabError('INTERNAL', '同じ ID のモードが既に存在します');
    }
    return { ...current, modes: [...current.modes, mode] };
  });

  return mode;
}

export async function updateMode(
  modeId: string,
  patch: Partial<Omit<Mode, 'id' | 'createdAt'>>,
): Promise<Mode> {
  let updated!: Mode;

  const data = await updateStorage((current) => {
    const index = current.modes.findIndex((m) => m.id === modeId);
    if (index === -1) {
      throw new FocusTabError('INVALID_MODE', 'モードが見つかりません');
    }
    updated = modeSchema.parse({
      ...current.modes[index],
      ...patch,
      updatedAt: new Date().toISOString(),
    });
    const modes = [...current.modes];
    modes[index] = updated;
    return { ...current, modes };
  });

  if (data.activeModeId === modeId) {
    await applyRulesForMode(updated);
  }

  return updated;
}

export async function deleteMode(modeId: string): Promise<void> {
  await updateStorage((current) => {
    if (current.modes.length <= 1) {
      throw new FocusTabError('INTERNAL', '最後の1つのモードは削除できません');
    }
    if (current.activeModeId === modeId) {
      throw new FocusTabError('INTERNAL', 'アクティブなモードは削除できません');
    }
    const modes = current.modes.filter((m) => m.id !== modeId);
    const { [modeId]: _removed, ...tabSnapshots } = current.tabSnapshots;
    const tasks = current.tasks.filter((t) => t.modeId !== modeId);
    const bookmarks = current.bookmarks.filter((b) => b.modeId !== modeId);
    return { ...current, modes, tabSnapshots, tasks, bookmarks };
  });
}

/** 仕事・学習・趣味を初期設定に戻す。カスタムモードとタスク・ブックマークは保持 */
export async function restoreDefaultModes(confirmed?: boolean): Promise<void> {
  if (!confirmed) {
    throw new FocusTabError('CONFIRMATION_REQUIRED', '初期モード復元の確認が必要です');
  }

  await assertNotLocked();

  const now = new Date().toISOString();
  const defaultIdSet = new Set<string>(DEFAULT_MODE_IDS);

  const data = await updateStorage((current) => {
    const restoredDefaults = defaultModes.map((template) => {
      const existing = current.modes.find((m) => m.id === template.id);
      return modeSchema.parse({
        ...template,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      });
    });

    const customModes = current.modes
      .filter((m) => !defaultIdSet.has(m.id))
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((m, index) => ({
        ...m,
        sortOrder: defaultModes.length + index,
      }));

    return {
      ...current,
      modes: [...restoredDefaults, ...customModes],
    };
  });

  const activeMode = data.modes.find((m) => m.id === data.activeModeId);
  if (activeMode) {
    await applyRulesForMode(activeMode);
  }
}

export async function syncBlockingWithActiveMode(): Promise<void> {
  const mode = await getActiveMode();
  await applyRulesForMode(mode);
}
