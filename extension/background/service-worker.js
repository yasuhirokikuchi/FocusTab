/**
 * FocusTab Service Worker (Phase 1 skeleton)
 *
 * Phase 2 以降で実装:
 * - モード状態管理 (SSOT)
 * - DNR ルールの動的更新
 * - タブ退避・復元キュー
 * - chrome.alarms によるロック管理
 */

console.log('[FocusTab] Service worker loaded (Phase 1 skeleton)');

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[FocusTab] First install — Phase 2 で初期データを投入');
  }
});

// Phase 2: メッセージハンドラのエントリポイント
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({ ok: true, phase: 1 });
    return true;
  }
});
