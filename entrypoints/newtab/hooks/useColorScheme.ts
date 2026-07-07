import { useEffect, useState } from 'react';
import {
  getSystemPrefersDark,
  resolveColorScheme,
  type ColorSchemePreference,
  type ResolvedColorScheme,
} from '@/shared/color-scheme';

export function useColorScheme(
  preference: ColorSchemePreference = 'dark',
): ResolvedColorScheme {
  const [resolved, setResolved] = useState<ResolvedColorScheme>(() =>
    resolveColorScheme(preference),
  );

  useEffect(() => {
    const update = () => setResolved(resolveColorScheme(preference));
    update();

    if (preference !== 'system') {
      return;
    }

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => update();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preference]);

  useEffect(() => {
    document.documentElement.style.colorScheme = resolved;
    return () => {
      document.documentElement.style.colorScheme = '';
    };
  }, [resolved]);

  return resolved;
}

export { getSystemPrefersDark, resolveColorScheme };
