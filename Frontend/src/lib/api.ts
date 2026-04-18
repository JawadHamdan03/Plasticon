export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

type ApiErrorPayload = {
  error?: string;
  message?: string;
};

export async function readApiError(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
  return payload.error ?? payload.message ?? "Something went wrong.";
}

/**
 * Global fetch wrapper that automatically adds Authorization header
 * This intercepts all fetch calls and ensures the token is sent
 */
export async function apiFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const token = typeof window !== "undefined"
    ? localStorage.getItem("plasticon_token")
    : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });
}




