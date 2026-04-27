import { parseUnits } from "viem";

export const WAD = 10n ** 18n;
const ZERO = 0n;

/** Multiply two WAD-denominated values: (a * b) / 1e18 */
export function wmul(a: bigint, b: bigint): bigint {
  return (a * b) / WAD;
}

/** Divide two WAD-denominated values: (a * 1e18) / b */
export function wdiv(a: bigint, b: bigint): bigint {
  if (b === ZERO) return ZERO;
  return (a * WAD) / b;
}

/** Convert a percentage (0-100) to a WAD fraction */
export function pctToWad(pct: number): bigint {
  return parseUnits((pct / 100).toFixed(18), 18);
}
