/** MODE_SWITCH 送信前に UI 側で収集するタブ参照 */
export interface ClientTabRef {
  tabId: number;
  windowId: number;
}

/** 全通常タブの参照を UI コンテキストで収集（SW より検出漏れが少ない） */
export async function collectClientTabRefs(): Promise<ClientTabRef[]> {
  const tabs = await chrome.tabs.query({});
  return tabs
    .filter(
      (t): t is chrome.tabs.Tab & { id: number; windowId: number } =>
        t.id != null && t.windowId != null && !t.incognito,
    )
    .map((t) => ({ tabId: t.id, windowId: t.windowId }));
}

export function uniqueWindowIds(refs: ClientTabRef[], restoreWindowId?: number): number[] {
  const ids = new Set(refs.map((r) => r.windowId));
  if (restoreWindowId != null) ids.add(restoreWindowId);
  return [...ids];
}
