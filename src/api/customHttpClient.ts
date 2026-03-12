export type RequestConfig<TData = unknown> = {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
  params?: Record<string, unknown>;
  data?: TData;
  signal?: AbortSignal;
  headers?: HeadersInit;
};

const BASE_URL = import.meta.env.VITE_OLYMPUS_UNITS_API_ENDPOINT ?? "";
const AUTH_TOKEN_KEY = "olympus_auth_token";

export const getAuthToken = (): string | null => localStorage.getItem(AUTH_TOKEN_KEY);
export const setAuthToken = (token: string): void => localStorage.setItem(AUTH_TOKEN_KEY, token);
export const clearAuthToken = (): void => localStorage.removeItem(AUTH_TOKEN_KEY);

export const customHttpClient = async <T, TData = unknown>(
  config: RequestConfig<TData>,
): Promise<T> => {
  const { url, method, params, data, signal, headers: extraHeaders } = config;

  const token = getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...extraHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const searchParams = params ? "?" + new URLSearchParams(params as Record<string, string>) : "";

  const response = await fetch(`${BASE_URL}${url}${searchParams}`, {
    method,
    headers,
    body: data !== undefined ? JSON.stringify(data) : undefined,
    signal,
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
};

export default customHttpClient;
