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

export async function apiFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  return fetch(url, { credentials: "include", ...options });
}




