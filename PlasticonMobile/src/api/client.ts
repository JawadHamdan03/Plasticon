import { getToken } from '../auth/storage';
import { API_BASE, RAG_BASE } from '../config';

// ─── Generic JSON fetcher ─────────────────────────────────────────────────────

async function request<T>(
  baseUrl: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${baseUrl}${path}`, { ...options, headers });

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

export async function uploadForm<T>(path: string, form: FormData): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: form,
  });

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
