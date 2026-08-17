import { Paginated, Resource } from "./types";

const PUBLIC_API =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const SERVER_API = process.env.API_URL || PUBLIC_API;
let accessToken: string | null = null;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as {
    message?: string;
  };
  if (!response.ok) {
    const message = Array.isArray(body.message)
      ? body.message.join(". ")
      : body.message;
    throw new ApiError(response.status, message || "Something went wrong");
  }
  return body as T;
}

export async function refreshSession() {
  const response = await fetch(`${PUBLIC_API}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  const result = await parseResponse<{
    accessToken: string;
    user: import("./types").User;
  }>(response);
  setAccessToken(result.accessToken);
  return result;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (
    !(options.body instanceof FormData) &&
    options.body &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${PUBLIC_API}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
  if (response.status === 401 && retry && !path.startsWith("/auth/")) {
    try {
      await refreshSession();
      return apiFetch<T>(path, options, false);
    } catch {
      setAccessToken(null);
    }
  }
  return parseResponse<T>(response);
}

export async function publicApi<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${SERVER_API}${path}`, {
    ...init,
    next: { revalidate: 60 },
  });
  return parseResponse<T>(response);
}

export async function catalog(
  params: URLSearchParams,
): Promise<Paginated<Resource>> {
  try {
    return await publicApi<Paginated<Resource>>(
      `/resources?${params.toString()}`,
    );
  } catch {
    return {
      items: [],
      pagination: { page: 1, limit: 12, total: 0, pages: 0 },
    };
  }
}
