const BASE_URL = import.meta.env.VITE_OLYMPUS_UNITS_API_ENDPOINT ?? "";
const AUTH_TOKEN_KEY = "olympus_auth_token";

export const getAuthToken = (): string | null => localStorage.getItem(AUTH_TOKEN_KEY);
export const setAuthToken = (token: string): void => localStorage.setItem(AUTH_TOKEN_KEY, token);
export const clearAuthToken = (): void => localStorage.removeItem(AUTH_TOKEN_KEY);

export const customHttpClient = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> | undefined),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
};

export default customHttpClient;
