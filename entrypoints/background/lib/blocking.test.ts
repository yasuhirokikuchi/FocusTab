import { describe, expect, it } from 'vitest';
import {
  domainMatchesBlacklist,
  getManagedRuleIds,
  isExcludedTabUrl,
} from './blocking';

describe('isExcludedTabUrl', () => {
  it('undefined や空は除外対象', () => {
    expect(isExcludedTabUrl(undefined)).toBe(true);
  });

  it('chrome:// や拡張機能 URL を除外する', () => {
    expect(isExcludedTabUrl('chrome://settings')).toBe(true);
    expect(isExcludedTabUrl('chrome-extension://abc/newtab.html')).toBe(true);
    expect(isExcludedTabUrl('edge://extensions')).toBe(true);
  });

  it('通常の https URL は除外しない', () => {
    expect(isExcludedTabUrl('https://example.com')).toBe(false);
  });

  it('WXT dev サーバーの newtab / blocked を除外する', () => {
    expect(isExcludedTabUrl('http://localhost:3000/newtab.html')).toBe(true);
    expect(isExcludedTabUrl('http://127.0.0.1:3000/blocked.html')).toBe(true);
    expect(isExcludedTabUrl('http://localhost:3000/other')).toBe(false);
  });
});

describe('domainMatchesBlacklist', () => {
  const blacklist = ['youtube.com', 'x.com'];

  it('完全一致でマッチする', () => {
    expect(domainMatchesBlacklist('https://youtube.com/watch', blacklist)).toBe(true);
  });

  it('サブドメインでマッチする', () => {
    expect(domainMatchesBlacklist('https://www.youtube.com/', blacklist)).toBe(true);
  });

  it('ブラックリスト外はマッチしない', () => {
    expect(domainMatchesBlacklist('https://github.com', blacklist)).toBe(false);
  });

  it('不正な URL はマッチしない', () => {
    expect(domainMatchesBlacklist('not-a-url', blacklist)).toBe(false);
  });
});

describe('getManagedRuleIds', () => {
  it('1001 から 200 件の連番 ID を返す', () => {
    const ids = getManagedRuleIds();
    expect(ids).toHaveLength(200);
    expect(ids[0]).toBe(1001);
    expect(ids[199]).toBe(1200);
  });
});
