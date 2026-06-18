import { resolve } from 'node:path';
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  srcDir: '.',
  outDir: '.output',
  alias: {
    '@': resolve(import.meta.dirname),
  },
  manifest: {
    name: 'FocusTab',
    description:
      'モード切替でタブ・閲覧環境を一括制御する集中支援拡張機能。すべてのデータはブラウザ内にのみ保存されます。',
    permissions: [
      'tabs',
      'storage',
      'alarms',
      'declarativeNetRequest',
      'declarativeNetRequestWithHostAccess',
      'webNavigation',
    ],
    host_permissions: ['<all_urls>'],
    action: {
      default_title: 'FocusTab',
    },
    options_ui: {
      page: 'options.html',
      open_in_tab: true,
    },
    web_accessible_resources: [
      {
        resources: ['blocked.html', 'chunks/*', 'assets/*'],
        matches: ['<all_urls>'],
      },
    ],
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'",
    },
  },
});
