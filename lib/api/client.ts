export type Audience = "customer" | "vendor" | "admin";

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }

  /** For Zod validation failures the backend sends `details` as a field-name -> messages[] map. */
  describe(): string {
    if (this.details && typeof this.details === "object") {
      const fieldErrors = Object.entries(this.details as Record<string, unknown>)
        .map(([field, messages]) => (Array.isArray(messages) ? `${field}: ${messages.join(", ")}` : null))
        .filter((line): line is string => !!line);
      if (fieldErrors.length > 0) return fieldErrors.join(" · ");
    }
    return this.message;
  }
}

const API_PREFIX = "/api/v1";
const API_BASE_URL = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000");

interface ApiSuccessBody<T> {
  success: true;
  message: string;
  data: T;
}

interface ApiErrorBody {
  success: false;
  message: string;
  details?: unknown;
}

/** Access tokens cache, initialized from localStorage on client-side if available. */
const tokens: Record<Audience, string | null> = {
  customer: typeof window !== "undefined" ? localStorage.getItem("byv_customer_token") : null,
  vendor: typeof window !== "undefined" ? localStorage.getItem("byv_vendor_token") : null,
  admin: typeof window !== "undefined" ? localStorage.getItem("byv_admin_token") : null,
};

export function getAccessToken(audience: Audience): string | null {
  // Safe fallback to localStorage if in-memory value is empty but present in client storage
  if (!tokens[audience] && typeof window !== "undefined") {
    tokens[audience] = localStorage.getItem(`byv_${audience}_token`);
  }
  return tokens[audience];
}

type TokenListener = (audience: Audience, token: string | null) => void;
const tokenListeners = new Set<TokenListener>();

/** Lets an auth provider react when a token is cleared elsewhere (e.g. a failed background refresh), so its UI stops assuming the user is still logged in. */
export function subscribeToTokenChanges(listener: TokenListener): () => void {
  tokenListeners.add(listener);
  return () => tokenListeners.delete(listener);
}

export function setAccessToken(audience: Audience, token: string | null) {
  tokens[audience] = token;
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem(`byv_${audience}_token`, token);
      localStorage.setItem(`byv_${audience}_has_session`, "true");
    } else {
      localStorage.removeItem(`byv_${audience}_token`);
      localStorage.removeItem(`byv_${audience}_has_session`);
    }
  }
  tokenListeners.forEach((listener) => listener(audience, token));
}

/** De-dupes concurrent refresh attempts for the same audience. */
const refreshInFlight: Partial<Record<Audience, Promise<string | null>>> = {};

async function refreshAccessToken(audience: Audience): Promise<string | null> {
  const existing = refreshInFlight[audience];
  if (existing) return existing;

  const attempt = (async () => {
    try {
      const res = await fetch(joinApiPath(`/auth/${audience}/refresh`), {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        setAccessToken(audience, null);
        return null;
      }
      const body = (await res.json()) as ApiSuccessBody<{ accessToken: string }>;
      setAccessToken(audience, body.data.accessToken);
      return body.data.accessToken;
    } catch {
      setAccessToken(audience, null);
      return null;
    } finally {
      delete refreshInFlight[audience];
    }
  })();

  refreshInFlight[audience] = attempt;
  return attempt;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Any plain object of primitive filters/pagination params; undefined/null/empty values are omitted. */
  query?: object;
  headers?: Record<string, string>;
  /** Attach the given audience's access token as a Bearer header, refreshing once on 401. */
  audience?: Audience;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(joinApiPath(path));
  if (query) {
    for (const [key, value] of Object.entries(query as Record<string, unknown>)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

function joinApiPath(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const prefixedPath = normalizedPath.startsWith(API_PREFIX) ? normalizedPath : `${API_PREFIX}${normalizedPath}`;
  return `${API_BASE_URL}${prefixedPath}`;
}

/**
 * Builds a fully-qualified API URL (base + /api/v1 + path + query). Use this for raw
 * fetch()es that need a blob/stream response instead of apiRequest's JSON parsing —
 * e.g. Excel exports. Keeps them on the same base URL as every other call.
 */
export function buildApiUrl(path: string, query?: Record<string, string | number | undefined>): string {
  const base = joinApiPath(path);
  if (!query) return base;
  const url = new URL(base);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function normalizeApiBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  return trimmed.endsWith(API_PREFIX) ? trimmed.slice(0, -API_PREFIX.length) : trimmed;
}

async function performFetch(path: string, options: RequestOptions, token: string | null): Promise<Response> {
  const headers: Record<string, string> = { ...options.headers };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    return await fetch(buildUrl(path, options.query), {
      method: options.method ?? "GET",
      headers,
      credentials: "include",
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch";
    throw new ApiError(0, `Network error: ${msg}. Please check if the backend server is running.`);
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { audience } = options;
  let token = audience ? getAccessToken(audience) : null;

  let res = await performFetch(path, options, token);

  if (res.status === 401 && audience) {
    token = await refreshAccessToken(audience);
    if (token) {
      res = await performFetch(path, options, token);
    }
  }

  let body: ApiSuccessBody<T> | ApiErrorBody | null = null;
  try {
    body = await res.json();
  } catch {
    // no body (e.g. network failure before response)
  }

  if (!res.ok || !body || body.success === false) {
    const message = body && "message" in body ? body.message : `Request failed with status ${res.status}`;
    const details = body && "details" in body ? body.details : undefined;
    throw new ApiError(res.status, message, details);
  }

  return (body as ApiSuccessBody<T>).data;
}

/** Attempts a silent session restore for the given audience using the refresh cookie. Returns the new token, or null if there's no valid session. */
export async function restoreSession(audience: Audience): Promise<string | null> {
  // If we already have a valid access token in memory or localStorage, reuse it.
  // This prevents unnecessary /refresh calls that can clear active sessions due to cross-site cookie blocking.
  const existingToken = getAccessToken(audience);
  if (existingToken) return existingToken;

  // Only attempt a network refresh if there is an indicator that a session was previously established.
  const hasSessionHint =
    typeof window !== "undefined" &&
    (localStorage.getItem(`byv_${audience}_has_session`) === "true" ||
      document.cookie.includes(`byv_${audience}_has_session=1`));

  if (!hasSessionHint) {
    return null;
  }

  return refreshAccessToken(audience);
}

async function performUpload(path: string, form: FormData, token: string | null): Promise<Response> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  // No Content-Type header — the browser sets multipart/form-data with the correct boundary itself.
  try {
    return await fetch(joinApiPath(path), {
      method: "POST",
      headers,
      credentials: "include",
      body: form,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    throw new ApiError(0, `Network error during upload: ${msg}. Please check if the backend server is running.`);
  }
}

/** Like apiRequest, but for multipart file uploads (FormData bodies) with the same token-refresh behavior. */
export async function uploadRequest<T>(path: string, form: FormData, audience: Audience): Promise<T> {
  let token = getAccessToken(audience);
  let res = await performUpload(path, form, token);

  if (res.status === 401) {
    token = await refreshAccessToken(audience);
    if (token) res = await performUpload(path, form, token);
  }

  let body: ApiSuccessBody<T> | ApiErrorBody | null = null;
  try {
    body = await res.json();
  } catch {
    // no body
  }

  if (!res.ok || !body || body.success === false) {
    const message = body && "message" in body ? body.message : `Request failed with status ${res.status}`;
    const details = body && "details" in body ? body.details : undefined;
    throw new ApiError(res.status, message, details);
  }

  return (body as ApiSuccessBody<T>).data;
}
