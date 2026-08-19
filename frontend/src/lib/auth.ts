const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8010';
const TOKEN_KEY = 'aarhat_auth_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

let onSessionExpired: (() => void) | null = null;

/** Registered once by App.tsx -- called whenever any API call comes back 401
 * (missing/invalid/expired token), so the app drops back to the login screen. */
export function setOnSessionExpired(handler: () => void): void {
  onSessionExpired = handler;
}

export function notifySessionExpired(): void {
  clearToken();
  onSessionExpired?.();
}

export async function login(username: string, password: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const body: { detail?: string } | null = await res.json().catch(() => null);
    throw new Error(body?.detail ?? `Login failed: ${res.status}`);
  }
  const { token }: { token: string } = await res.json();
  setToken(token);
}
