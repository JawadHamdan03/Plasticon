// ─── In-memory session storage ────────────────────────────────────────────────
// Token and user are kept in memory only.
// When the app is closed/killed, memory is cleared → user must log in again.

let _token: string | null = null;
let _onSessionExpired: (() => void) | null = null;

export function saveToken(token: string): void {
  _token = token;
}

export function getToken(): string | null {
  return _token;
}

export function removeToken(): void {
  _token = null;
}

// Called by the API client when the server returns 401.
// AuthContext registers the actual handler so it can clear React state.
export function setSessionExpiredHandler(fn: () => void): void {
  _onSessionExpired = fn;
}

export function triggerSessionExpired(): void {
  _token = null; // always clear token immediately
  _onSessionExpired?.();
}

// clearSession is called on logout
export async function clearSession(): Promise<void> {
  _token = null;
}

// These are kept for API compatibility but do nothing — user data lives in
// React state only, not persisted across app launches.
export async function saveUser(_user: object): Promise<void> {}

export async function getSavedUser<T>(): Promise<T | null> {
  return null;
}
