const STORAGE_KEY = 'netma_auth';

export interface AuthState {
  username: string;
  loggedIn: boolean;
}

export function getAuth(): AuthState | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuth(username: string): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ username, loggedIn: true }));
}

export function clearAuth(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function isAuthenticated(): boolean {
  const auth = getAuth();
  return auth !== null && auth.loggedIn === true;
}
