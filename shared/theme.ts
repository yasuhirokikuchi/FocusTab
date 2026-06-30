/** FocusTab 共通カラーパレット */

export const THEME_COLORS = {
  base: '#738b93',
  accent: '#52bec6',
  sub: '#e1edf6',
} as const;

export const DEFAULT_MODE_THEME = {
  accent: THEME_COLORS.accent,
  bg: THEME_COLORS.base,
  text: THEME_COLORS.sub,
} as const;

/** React の style プロパティ用 CSS 変数 */
export const themeCssVariables = {
  '--ft-base': THEME_COLORS.base,
  '--ft-accent': THEME_COLORS.accent,
  '--ft-sub': THEME_COLORS.sub,
  '--ft-bg': THEME_COLORS.base,
  '--ft-text': THEME_COLORS.sub,
} as const;

/** モード管理 UI のアクセントカラー候補（パレット内） */
export const THEME_ACCENT_PRESETS = [
  THEME_COLORS.accent,
  THEME_COLORS.base,
  THEME_COLORS.sub,
] as const;
