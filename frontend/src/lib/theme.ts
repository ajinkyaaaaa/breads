const THEME_KEY = 'aarhat_theme';

export type Theme = 'dark' | 'light';

/** Read the stored preference -- also applied synchronously by an inline
 * script in index.html before first paint, so this is only re-read here to
 * initialize React state to match what's already on <html>. */
export function getStoredTheme(): Theme {
  return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
}
