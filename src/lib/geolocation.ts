/**
 * Fetches geolocation data from Cloudflare's trace endpoint
 * @returns The country code (e.g., "US", "GB") or null if unable to determine
 */
export async function getCountryCode(): Promise<string | null> {
  try {
    const response = await fetch("https://www.cloudflare.com/cdn-cgi/trace");
    const data = await response.text();

    // Parse the trace response which is in key=value format
    const lines = data.split("\n");
    const locLine = lines.find((line) => line.startsWith("loc="));

    if (locLine) {
      const countryCode = locLine.split("=")[1];
      return countryCode.trim();
    }

    return null;
  } catch (error) {
    console.error("Failed to fetch geolocation data:", error);
    return null;
  }
}

/**
 * Enable/disable geo-blocking (set to false during development)
 */
const GEO_BLOCKING_ENABLED = import.meta.env.PROD;

/**
 * List of blocked country codes (ISO 3166-1 alpha-2)
 */
export const BLOCKED_COUNTRIES = ["US"];

/**
 * List of routes that should not be geoblocked (public routes)
 */
export const PUBLIC_ROUTES = ["/statistics"];

/**
 * Checks if a country code is blocked
 * @param countryCode - The ISO 3166-1 alpha-2 country code
 * @returns true if the country is blocked
 */
export function isCountryBlocked(countryCode: string | null): boolean {
  if (!GEO_BLOCKING_ENABLED) return false;
  if (!countryCode) return false;
  return BLOCKED_COUNTRIES.includes(countryCode.toUpperCase());
}

/**
 * Checks if the current user's location is blocked
 * @returns true if the user's country is blocked
 */
export async function isUserBlocked(): Promise<boolean> {
  const countryCode = await getCountryCode();
  return isCountryBlocked(countryCode);
}

/**
 * Checks if geoblocking should be applied to a specific route
 * @param pathname - The route pathname (e.g., "/statistics")
 * @returns true if the route should be geoblocked
 */
export function shouldApplyGeoblocking(pathname: string): boolean {
  // Remove hash and query parameters for comparison
  const cleanPath = pathname.split("?")[0].split("#")[0];
  return !PUBLIC_ROUTES.some((route) => cleanPath === route || cleanPath.startsWith(`${route}/`));
}
