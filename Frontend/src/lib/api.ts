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

/**
 * Constructs an authenticated URL for a picture stored on the server.
 * Appends the JWT as a query param so <img> tags and <a href> links
 * work cross-origin without needing custom request headers.
 */
export function pictureUrl(filename: string | null | undefined): string {
  if (!filename) return "";
  const clean = filename.replace(/^(?:prisma\/?)?pictures\//, "");
  const token = localStorage.getItem("plasticon_token") ?? "";
  return `${API_BASE_URL}/pictures/${clean}?token=${encodeURIComponent(token)}`;
}




