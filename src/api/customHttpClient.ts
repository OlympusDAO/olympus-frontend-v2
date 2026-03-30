const BASE_URL = import.meta.env.VITE_OLYMPUS_UNITS_API_ENDPOINT ?? "";

const AUTH_TOKEN_PREFIX = "olympus_auth_token";
const tokenKey = (address: string) => `${AUTH_TOKEN_PREFIX}_${address.toLowerCase()}`;

// Tracks the currently connected EOA so the HTTP client can look up the right token.
// Updated by useAuth whenever the wagmi address changes.
let _currentAddress: string | null = null;
export const setCurrentAddress = (address: string | null): void => {
  _currentAddress = address;
};

export const getAuthToken = (address: string): string | null =>
  localStorage.getItem(tokenKey(address));

export const setAuthToken = (address: string, token: string): void =>
  localStorage.setItem(tokenKey(address), token);

export const clearAuthToken = (address: string): void => localStorage.removeItem(tokenKey(address));

export const clearAllAuthTokens = (): void => {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(AUTH_TOKEN_PREFIX)) localStorage.removeItem(key);
  }
};

export const customHttpClient = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const token = _currentAddress ? getAuthToken(_currentAddress) : null;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> | undefined),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearAllAuthTokens();
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
};

export default customHttpClient;
