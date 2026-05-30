// ─── In-memory session storage ────────────────────────────────────────────────
// Token and user are kept in memory only.
// When the app is closed/killed, memory is cleared → user must log in again.

let _token: string | null = null;

export function saveToken(token: string): void {
  _token = token;
}

export function getToken(): string | null {
  return _token;
}

export function removeToken(): void {
  _token = null;
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
