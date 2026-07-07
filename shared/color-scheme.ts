export const COLOR_SCHEME_PREFERENCES = ["light", "dark", "system"] as const;

export type ColorSchemePreference = (typeof COLOR_SCHEME_PREFERENCES)[number];
export type ResolvedColorScheme = "light" | "dark";

export const COLOR_SCHEME_LABELS: Record<ColorSchemePreference, string> = {
  light: "ライト",
  dark: "ダーク",
  system: "コンピュータに合わせる",
};

/** 設定値から実際に適用する light / dark を解決する */
export function resolveColorScheme(
  preference: ColorSchemePreference,
  prefersDark = getSystemPrefersDark(),
): ResolvedColorScheme {
  if (preference === "light") return "light";
  if (preference === "dark") return "dark";
  return prefersDark ? "dark" : "light";
}

export function getSystemPrefersDark(): boolean {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}
