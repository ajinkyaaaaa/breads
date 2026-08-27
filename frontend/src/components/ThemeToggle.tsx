import { useEffect, useState } from 'react';
import { applyTheme, getStoredTheme, type Theme } from '../lib/theme';
import { Icon } from './Icon';

/** Small icon+label toggle between the dark (default) and soft-white themes.
 * Each window (main dashboard, trip explorer tab) reads/writes the same
 * localStorage key independently -- flipping it here doesn't live-update an
 * already-open second tab, only what it reads the next time it loads. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <button
      onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      title={theme === 'dark' ? 'Switch to the soft white theme' : 'Switch to the dark theme'}
      className={`flex items-center gap-1.5 rounded-sm border border-wheat/15 bg-surface px-2.5 py-1 text-[12px] font-medium uppercase tracking-wide text-wheat transition-colors duration-150 hover:border-amber/40 hover:text-amber ${className}`}
    >
      <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} size={14} />
      {theme === 'dark' ? 'Light' : 'Dark'}
    </button>
  );
}
