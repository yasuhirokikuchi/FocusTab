import type { Mode } from '@/shared/schemas';

const DNR_RULE_BASE_ID = 1000;
const DNR_MAX_RULES = 200;
/** Chrome MV3: redirect ルールは unsafe 分類、動的上限 5000 */
export const DNR_UNSAFE_LIMIT = 5000;

export function isExcludedTabUrl(url: string | undefined): boolean {
  if (!url) return true;
  const lower = url.toLowerCase();
  return (
    lower.startsWith('chrome://') ||
    lower.startsWith('chrome-extension://') ||
    lower.startsWith('edge://') ||
    lower.startsWith('about:') ||
    lower.startsWith('devtools://') ||
    isFocusTabDevServerUrl(url)
  );
}

/** WXT dev: newtab が localhost で配信される場合 */
function isFocusTabDevServerUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host !== 'localhost' && host !== '127.0.0.1') return false;
    return parsed.pathname.includes('newtab') || parsed.pathname.includes('blocked');
  } catch {
    return false;
  }
}

export function isFocusTabPageUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const base = chrome.runtime.getURL('').replace(/\/$/, '');
    return url.startsWith(base) || isFocusTabDevServerUrl(url);
  } catch {
    return false;
  }
}

/** 閲覧制限のブロック画面か */
export function isBlockedPageUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const path = new URL(url).pathname.toLowerCase();
    return path.endsWith('blocked.html');
  } catch {
    return false;
  }
}

/**
 * 退避スナップショット用 URL。
 * ブロック画面は元ドメインを復元し、切替後に元サイトとして扱えるようにする。
 */
export function resolveUrlForEvacuation(url: string | undefined): string {
  if (!url) return 'about:blank';
  if (!isBlockedPageUrl(url)) return url;

  try {
    const site = new URL(url).searchParams.get('site')?.trim().toLowerCase();
    if (!site) return url;
    // スキーム付きで渡された場合はそのまま、ドメインのみなら https を補う
    if (site.includes('://')) return site;
    return `https://${site}`;
  } catch {
    return url;
  }
}

export function domainMatchesBlacklist(url: string, blacklist: string[]): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return blacklist.some((domain) => {
      const d = domain.toLowerCase();
      return hostname === d || hostname.endsWith(`.${d}`);
    });
  } catch {
    return false;
  }
}

function blockedRedirectPath(domain: string, modeId: string): string {
  const params = new URLSearchParams({
    reason: 'blacklist',
    site: domain,
    mode: modeId,
  });
  return `/blocked.html?${params.toString()}`;
}

function buildRedirectRules(mode: Mode): chrome.declarativeNetRequest.Rule[] {
  if (!mode.isRestrictive || mode.blacklist.length === 0) return [];

  return mode.blacklist.slice(0, DNR_MAX_RULES).map((domain, index) => ({
    id: DNR_RULE_BASE_ID + index + 1,
    priority: 1,
    condition: {
      urlFilter: `||${domain}^`,
      resourceTypes: ['main_frame' as chrome.declarativeNetRequest.ResourceType],
    },
    action: {
      type: 'redirect' as const,
      redirect: {
        extensionPath: blockedRedirectPath(domain, mode.id),
      },
    },
  }));
}

export function getManagedRuleIds(): number[] {
  return Array.from({ length: DNR_MAX_RULES }, (_, i) => DNR_RULE_BASE_ID + i + 1);
}

export async function applyRulesForMode(mode: Mode): Promise<void> {
  const removeRuleIds = getManagedRuleIds();
  const addRules = buildRedirectRules(mode);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules: mode.isRestrictive ? addRules : [],
  });

  const stats = await getDnrRuleStats();
  console.log('[FocusTab] DNR rules applied', { modeId: mode.id, ...stats });
}

export async function getDnrRuleStats(): Promise<{
  dynamicRuleCount: number;
  managedRuleCount: number;
  unsafeLimit: number;
}> {
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  const managedIds = new Set(getManagedRuleIds());
  const managedRuleCount = rules.filter((r) => managedIds.has(r.id)).length;
  return {
    dynamicRuleCount: rules.length,
    managedRuleCount,
    unsafeLimit: DNR_UNSAFE_LIMIT,
  };
}

export async function clearBlockingRules(): Promise<void> {
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: getManagedRuleIds(),
    addRules: [],
  });
}

export function buildBlockedPageUrl(url: string, mode: Mode): string | null {
  if (!mode.isRestrictive) return null;
  try {
    const hostname = new URL(url).hostname;
    const matched = mode.blacklist.find((domain) =>
      domainMatchesBlacklist(url, [domain]),
    );
    if (!matched) return null;
    const path = blockedRedirectPath(matched || hostname, mode.id);
    return chrome.runtime.getURL(path.slice(1));
  } catch {
    return null;
  }
}

let navigationInitialized = false;

export function initWebNavigationHandlers(
  getActiveMode: () => Promise<Mode | null>,
): void {
  if (navigationInitialized) return;
  navigationInitialized = true;

  const handleNavigation = async (
    tabId: number,
    url: string,
  ): Promise<void> => {
    if (isExcludedTabUrl(url)) return;
    const mode = await getActiveMode();
    if (!mode?.isRestrictive) return;

    const blockedUrl = buildBlockedPageUrl(url, mode);
    if (!blockedUrl) return;

    try {
      await chrome.tabs.update(tabId, { url: blockedUrl });
    } catch {
      // タブが既に閉じている等
    }
  };

  chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
    if (details.frameId !== 0) return;
    void handleNavigation(details.tabId, details.url);
  });

  chrome.webNavigation.onCommitted.addListener((details) => {
    if (details.frameId !== 0) return;
    if (details.transitionQualifiers.includes('forward_back')) return;
    void handleNavigation(details.tabId, details.url);
  });

  // SPA: tabs.onUpdated で URL 変更を補完（webNavigation 取りこぼし対策）
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    const url = changeInfo.url ?? tab.url;
    if (!url) return;
    void handleNavigation(tabId, url);
  });
}
