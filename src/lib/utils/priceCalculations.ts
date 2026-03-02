/**
 * Price calculation utilities for limit orders
 * Max price format: USDS per OHM scaled by 1e18 (same as tick price)
 * Example: 32.4566 USDS/OHM = 32456600000000000000 (bigint)
 */

const PRICE_SCALE = 1e18;
const OHM_SCALE = 1e9;

/**
 * Adjust price by percentage (for -1%, -3%, -5%, -10% buttons)
 * @param currentPrice - Current market price in contract format (scaled by 1e18)
 * @param percentageAdjustment - Percentage to adjust (e.g., -5 for -5%)
 * @returns Adjusted price in contract format
 */
export function calculateMaxPriceAdjustment(
  currentPrice: bigint,
  percentageAdjustment: number,
): bigint {
  const adjustmentFactor = BigInt(Math.floor(10000 + percentageAdjustment * 100));
  return (currentPrice * adjustmentFactor) / 10000n;
}

/**
 * Calculate expected OHM output at max price
 * @param depositAmount - Deposit amount in USDS (18 decimals)
 * @param maxPrice - Max price in contract format (scaled by 1e18)
 * @returns Expected OHM output (9 decimals)
 */
export function calculateOhmAtMaxPrice(depositAmount: bigint, maxPrice: bigint): bigint {
  if (maxPrice === 0n) return 0n;
  // depositAmount (18 decimals) * 1e9 / maxPrice (18 decimals) = OHM (9 decimals)
  return (depositAmount * BigInt(OHM_SCALE)) / maxPrice;
}

/**
 * Format max price for display (USDS/OHM)
 * @param price - Price in contract format (scaled by 1e18)
 * @returns Formatted price string
 */
export function formatMaxPrice(price: bigint): string {
  return (Number(price) / PRICE_SCALE).toFixed(4);
}

/**
 * Parse user input price to contract format
 * @param priceString - Price as string from user input
 * @returns Price in contract format (scaled by 1e18)
 */
export function parseMaxPrice(priceString: string): bigint {
  const priceFloat = parseFloat(priceString);
  if (Number.isNaN(priceFloat) || priceFloat <= 0) {
    return 0n;
  }
  return BigInt(Math.floor(priceFloat * PRICE_SCALE));
}

/**
 * Validate max price against current market price
 * @param maxPrice - Max price in contract format
 * @param currentMarketPrice - Current market price in contract format
 * @returns Validation result with optional warning
 */
export function validateMaxPrice(
  maxPrice: bigint,
  currentMarketPrice: bigint,
): {
  valid: boolean;
  warning?: string;
} {
  if (maxPrice <= 0n) {
    return { valid: false };
  }

  if (maxPrice > currentMarketPrice) {
    return {
      valid: true,
      warning: "Price above market - order may fill immediately at current market price",
    };
  }

  // Check if price is unreasonably low (e.g., 50% below market)
  const minReasonablePrice = (currentMarketPrice * 50n) / 100n;
  if (maxPrice < minReasonablePrice) {
    return {
      valid: true,
      warning: "Price significantly below market - order may never fill",
    };
  }

  return { valid: true };
}

/**
 * Format OHM amount for display
 * @param ohmAmount - OHM amount (9 decimals)
 * @returns Formatted OHM string
 */
export function formatOhm(ohmAmount: bigint): string {
  return (Number(ohmAmount) / OHM_SCALE).toFixed(2);
}

/**
 * Format USDS amount for display
 * @param usdsAmount - USDS amount (18 decimals)
 * @returns Formatted USDS string
 */
export function formatUsds(usdsAmount: bigint): string {
  return (Number(usdsAmount) / 1e18).toFixed(2);
}
