import { getToken } from '../auth/storage';
import { API_BASE, RAG_BASE } from '../config';

// Log once at startup so the console shows which URL is in use
console.log('[API] base URL:', API_BASE);

const TIMEOUT_MS = 15_000;

// ─── Generic JSON fetcher ─────────────────────────────────────────────────────

async function request<T>(
  baseUrl: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, { ...options, headers, signal: controller.signal });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('Request timed out. Check your network connection.');
    }
    throw new Error('Network error. Make sure the server is reachable.');
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(
      (body as { error?: string; message?: string }).error ??
      (body as { message?: string }).message ??
      `Error ${res.status}`,
    );
  }

  return res.json() as Promise<T>;
}

// ─── Multipart upload (for file fields) ──────────────────────────────────────

export async function uploadForm<T>(path: string, form: FormData, method: 'POST' | 'PUT' = 'POST'): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000); // longer for file uploads

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { method, headers, body: form, signal: controller.signal });
  } catch (err: any) {
    if (err?.name === 'AbortError') throw new Error('Upload timed out.');
    throw new Error('Network error.');
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(
      (body as { error?: string; message?: string }).error ??
      (body as { message?: string }).message ??
      `Error ${res.status}`,
    );
  }

  return res.json() as Promise<T>;
}

// ─── Main API (port 8080) ────────────────────────────────────────────────────

export const api = {
  get:    <T>(path: string)                     => request<T>(API_BASE, path),
  post:   <T>(path: string, body: unknown)      => request<T>(API_BASE, path, { method: 'POST',  body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown)      => request<T>(API_BASE, path, { method: 'PUT',   body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown)      => request<T>(API_BASE, path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string)                     => request<T>(API_BASE, path, { method: 'DELETE' }),
};

// ─── RAG / AI API (port 3001) ─────────────────────────────────────────────────

export const ragApi = {
  post: <T>(path: string, body: unknown) =>
    request<T>(RAG_BASE, path, { method: 'POST', body: JSON.stringify(body) }),
};
