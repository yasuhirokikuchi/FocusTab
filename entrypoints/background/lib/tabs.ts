import {
  MAX_TABS_PER_SNAPSHOT,
  RESTORE_BATCH_DELAY_MS,
} from '@/shared/constants';
import { SESSION_KEYS, STORAGE_KEYS } from '@/shared/storage-keys';
import type { RestoreProgress, RestoreQueue, TabSnapshot } from '@/shared/schemas';
import { restoreQueueSchema } from '@/shared/schemas';
import { patchStorage } from './state';
import { isExcludedTabUrl, isFocusTabPageUrl } from './blocking';
import type { ClientTabRef } from '@/shared/evacuation-windows';

export interface EvacuateTabsOptions {
  /** MODE_SWITCH 送信元タブ — 退避・クローズ対象から除外 */
  keepTabId?: number;
  /** true のとき、退避後にタブがなくなるウィンドウへアンカータブを作らない */
  skipAnchorTab?: boolean;
  /** UI 側で収集したタブ参照（Service Worker の query 漏れ対策） */
  clientTabRefs?: ClientTabRef[];
}

function shouldKeepTabDuringEvacuation(
  tab: chrome.tabs.Tab,
  keepTabId?: number,
): boolean {
  if (tab.id == null) return true;
  if (keepTabId !== undefined && tab.id === keepTabId) return true;
  if (isExcludedTabUrl(tab.url)) return true;
  if (isFocusTabPageUrl(tab.url)) return true;
  return false;
}

async function ensureAnchorTab(windowId: number): Promise<void> {
  await chrome.tabs.create({
    windowId,
    url: chrome.runtime.getURL('newtab.html'),
    active: false,
  });
}

export function trimSnapshots(snapshots: TabSnapshot[]): TabSnapshot[] {
  if (snapshots.length <= MAX_TABS_PER_SNAPSHOT) return snapshots;
  return [...snapshots]
    .sort((a, b) => a.index - b.index)
    .slice(-MAX_TABS_PER_SNAPSHOT);
}

export async function getCurrentWindowId(): Promise<number> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.windowId) {
    throw new Error('アクティブウィンドウが見つかりません');
  }
  return tab.windowId;
}

/** モード切替の復元先ウィンドウを決定する */
export async function resolveRestoreWindowId(options?: {
  senderWindowId?: number;
  senderTabId?: number;
}): Promise<number> {
  if (options?.senderWindowId != null) {
    return options.senderWindowId;
  }
  if (options?.senderTabId != null) {
    try {
      const tab = await chrome.tabs.get(options.senderTabId);
      if (tab.windowId != null) return tab.windowId;
    } catch {
      // fall through
    }
  }
  return getCurrentWindowId();
}

/** 退避結果が空のときは既存スナップショットを保持する */
export function buildModeSnapshot(
  evacuated: TabSnapshot[],
  existing: TabSnapshot[] | undefined,
): TabSnapshot[] {
  if (evacuated.length > 0) return evacuated;
  return existing ?? [];
}

export async function evacuateTabs(
  windowId: number,
  options?: EvacuateTabsOptions,
): Promise<TabSnapshot[]> {
  const tabs = (await chrome.tabs.query({ windowId })).filter((t) => !t.incognito);
  const evacuatable = tabs.filter(
    (t) => t.id != null && !shouldKeepTabDuringEvacuation(t, options?.keepTabId),
  );

  const now = new Date().toISOString();
  const snapshots: TabSnapshot[] = evacuatable.map((tab, index) => ({
    url: tab.url ?? 'about:blank',
    title: tab.title ?? '',
    pinned: tab.pinned ?? false,
    index: tab.index ?? index,
    savedAt: now,
  }));

  const trimmed = trimSnapshots(snapshots);

  if (evacuatable.length === 0) {
    return trimmed;
  }

  const remainingAfterRemoval = tabs.length - evacuatable.length;
  if (remainingAfterRemoval === 0 && !options?.skipAnchorTab) {
    await ensureAnchorTab(windowId);
  }

  for (const tab of evacuatable) {
    try {
      await chrome.tabs.remove(tab.id!);
    } catch (err) {
      console.warn('[FocusTab] Tab close skipped:', tab.id, tab.url, err);
    }
  }

  return trimmed;
}

/** UI が渡した tabId を直接参照して退避（SW の tabs.query 漏れを回避） */
async function evacuateViaClientTabRefs(
  restoreWindowId: number,
  clientTabRefs: ClientTabRef[],
  options?: EvacuateTabsOptions,
): Promise<TabSnapshot[]> {
  const now = new Date().toISOString();
  const toRemove: number[] = [];
  const snapshots: TabSnapshot[] = [];

  for (const ref of clientTabRefs) {
    let tab: chrome.tabs.Tab;
    try {
      tab = await chrome.tabs.get(ref.tabId);
    } catch {
      continue;
    }
    if (tab.incognito || tab.id == null || tab.windowId == null) continue;
    if (shouldKeepTabDuringEvacuation(tab, options?.keepTabId)) continue;

    toRemove.push(tab.id);
    snapshots.push({
      url: tab.url ?? 'about:blank',
      title: tab.title ?? '',
      pinned: tab.pinned ?? false,
      index: snapshots.length,
      savedAt: now,
    });
  }

  const trimmed = trimSnapshots(snapshots);
  if (toRemove.length === 0) return trimmed;

  const affectedWindows = new Set(clientTabRefs.map((r) => r.windowId));
  affectedWindows.add(restoreWindowId);

  for (const tabId of toRemove) {
    try {
      await chrome.tabs.remove(tabId);
    } catch (err) {
      console.warn('[FocusTab] Tab close skipped:', tabId, err);
    }
  }

  for (const windowId of affectedWindows) {
    const remaining = (await chrome.tabs.query({ windowId })).filter((t) => !t.incognito);
    if (remaining.length === 0 && windowId === restoreWindowId) {
      await ensureAnchorTab(windowId);
    }
  }

  return trimmed;
}

/** 退避対象ウィンドウ ID — tabs.query を主軸に収集（getAll だけでは検出漏れする場合がある） */
async function getEvacuationWindowIds(restoreWindowId: number): Promise<{
  windowIds: number[];
  fromGetAll: number[];
  fromTabsQuery: number[];
}> {
  const [allTabs, allWindows] = await Promise.all([
    chrome.tabs.query({}),
    chrome.windows.getAll({ windowTypes: ['normal'] }),
  ]);

  const fromTabsQuery = new Set<number>();
  for (const tab of allTabs) {
    if (tab.incognito || tab.windowId == null) continue;
    fromTabsQuery.add(tab.windowId);
  }

  const fromGetAll = allWindows
    .filter((w) => w.id != null && !w.incognito)
    .map((w) => w.id!);

  const windowIds = new Set<number>([...fromTabsQuery, ...fromGetAll, restoreWindowId]);
  return {
    windowIds: [...windowIds],
    fromGetAll,
    fromTabsQuery: [...fromTabsQuery],
  };
}

/** 通常ウィンドウすべてからタブを退避する（ドラッグで分離したウィンドウを含む） */
export async function evacuateAllWindows(
  restoreWindowId: number,
  options?: EvacuateTabsOptions,
): Promise<TabSnapshot[]> {
  if (options?.clientTabRefs && options.clientTabRefs.length > 0) {
    return evacuateViaClientTabRefs(
      restoreWindowId,
      options.clientTabRefs,
      options,
    );
  }

  const { windowIds } = await getEvacuationWindowIds(restoreWindowId);

  const allSnapshots: TabSnapshot[] = [];
  let indexOffset = 0;

  for (const windowId of windowIds) {
    const isRestoreWindow = windowId === restoreWindowId;
    const snapshots = await evacuateTabs(windowId, {
      keepTabId: isRestoreWindow ? options?.keepTabId : undefined,
      skipAnchorTab: !isRestoreWindow,
    });
    for (const snap of snapshots) {
      allSnapshots.push({ ...snap, index: indexOffset++ });
    }
  }

  return trimSnapshots(allSnapshots);
}

export async function restoreEvacuatedTabs(
  snapshots: TabSnapshot[],
  windowId: number,
): Promise<void> {
  for (const snap of snapshots) {
    try {
      await chrome.tabs.create({
        url: snap.url,
        windowId,
        pinned: snap.pinned,
        active: false,
      });
    } catch {
      // 個別タブ復元失敗は続行
    }
  }
}

async function loadQueue(): Promise<RestoreQueue | null> {
  const result = await chrome.storage.session.get(SESSION_KEYS.RESTORE_QUEUE);
  const raw = result[SESSION_KEYS.RESTORE_QUEUE];
  if (!raw) return null;
  const parsed = restoreQueueSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

async function saveQueue(queue: RestoreQueue | null): Promise<void> {
  await chrome.storage.session.set({
    [SESSION_KEYS.RESTORE_QUEUE]: queue,
  });
}

async function updateProgress(progress: RestoreProgress | null): Promise<void> {
  await patchStorage({ restoreProgress: progress });
}

let restoreRunning = false;
let restoreGeneration = 0;

async function processBatch(queue: RestoreQueue, generation: number): Promise<void> {
  if (generation !== restoreGeneration) return;

  const data = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  const batchSize =
    typeof data.settings?.restoreBatchSize === 'number'
      ? data.settings.restoreBatchSize
      : 3;

  const batch = queue.snapshots.slice(queue.nextIndex, queue.nextIndex + batchSize);
  if (batch.length === 0) {
    if (generation !== restoreGeneration) return;
    await updateProgress({
      jobId: queue.jobId,
      modeId: queue.modeId,
      total: queue.snapshots.length,
      completed: queue.snapshots.length,
      status: 'completed',
    });
    await saveQueue(null);
    if (generation === restoreGeneration) {
      restoreRunning = false;
    }
    return;
  }

  for (const snap of batch) {
    try {
      await chrome.tabs.create({
        url: snap.url,
        windowId: queue.windowId,
        pinned: snap.pinned,
        active: false,
      });
    } catch {
      // 続行
    }
  }

  if (generation !== restoreGeneration) return;

  const nextIndex = queue.nextIndex + batch.length;
  const completed = nextIndex;

  await updateProgress({
    jobId: queue.jobId,
    modeId: queue.modeId,
    total: queue.snapshots.length,
    completed,
    status: 'running',
  });

  const nextQueue: RestoreQueue = { ...queue, nextIndex };
  await saveQueue(nextQueue);

  if (nextIndex >= queue.snapshots.length) {
    if (generation !== restoreGeneration) return;
    await updateProgress({
      jobId: queue.jobId,
      modeId: queue.modeId,
      total: queue.snapshots.length,
      completed: queue.snapshots.length,
      status: 'completed',
    });
    await saveQueue(null);
    if (generation === restoreGeneration) {
      restoreRunning = false;
    }
    return;
  }

  setTimeout(() => {
    void processBatch(nextQueue, generation);
  }, RESTORE_BATCH_DELAY_MS);
}

export async function startRestore(
  snapshots: TabSnapshot[],
  modeId: string,
  windowId: number,
): Promise<string> {
  const jobId = crypto.randomUUID();

  if (snapshots.length === 0) {
    await updateProgress({
      jobId,
      modeId,
      total: 0,
      completed: 0,
      status: 'completed',
    });
    return jobId;
  }

  const queue: RestoreQueue = {
    jobId,
    modeId,
    snapshots,
    nextIndex: 0,
    windowId,
  };

  await saveQueue(queue);
  await updateProgress({
    jobId,
    modeId,
    total: snapshots.length,
    completed: 0,
    status: 'running',
  });

  restoreGeneration += 1;
  const generation = restoreGeneration;
  restoreRunning = true;
  void processBatch(queue, generation);

  return jobId;
}

export async function getRestoreProgress(jobId?: string): Promise<RestoreProgress | null> {
  const data = await chrome.storage.local.get(STORAGE_KEYS.RESTORE_PROGRESS);
  const progress = data[STORAGE_KEYS.RESTORE_PROGRESS] as RestoreProgress | null;
  if (!progress) return null;
  if (jobId && progress.jobId !== jobId) return null;
  return progress;
}

export async function resumeRestoreIfNeeded(): Promise<void> {
  const queue = await loadQueue();
  if (!queue || restoreRunning) return;
  restoreGeneration += 1;
  const generation = restoreGeneration;
  restoreRunning = true;
  void processBatch(queue, generation);
}

export async function cancelRestore(jobId: string): Promise<void> {
  const queue = await loadQueue();
  if (queue?.jobId !== jobId) return;

  await saveQueue(null);
  await updateProgress({
    jobId,
    modeId: queue.modeId,
    total: queue.snapshots.length,
    completed: queue.nextIndex,
    status: 'cancelled',
  });
  restoreGeneration += 1;
  restoreRunning = false;
}
