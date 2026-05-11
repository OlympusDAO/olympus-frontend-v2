import { describe, it, expect } from "vitest";
import { parseUnits } from "viem";
import { calculateInterestRateBps, computeLiquidationDate } from "../cooler-math";

describe("calculateInterestRateBps", () => {
  it("converts WAD interest rate to basis points", () => {
    // ln(1 + 0.05) ≈ 0.04879 → 0.04879e18 WAD
    // exp(0.04879) - 1 ≈ 0.05 → 500 bps
    const interestRateWad = parseUnits("0.04879016416943205", 18);
    expect(calculateInterestRateBps(interestRateWad)).toBe(500); // 5%
  });

  it("handles zero rate", () => {
    expect(calculateInterestRateBps(0n)).toBe(0);
  });

  it("handles small rates", () => {
    // ~0.5% annual rate
    const interestRateWad = parseUnits("0.004987541511038553", 18);
    expect(calculateInterestRateBps(interestRateWad)).toBe(50); // 0.5%
  });
});

describe("computeLiquidationDate", () => {
  const rate5pct = parseUnits("0.04879", 18);

  it("returns null when there is no debt", () => {
    expect(computeLiquidationDate(0n, parseUnits("1000", 18), rate5pct)).toBeNull();
  });

  it("returns null when there is no threshold", () => {
    expect(computeLiquidationDate(parseUnits("1000", 18), 0n, rate5pct)).toBeNull();
  });

  it("returns null at zero rate (debt cannot grow)", () => {
    expect(computeLiquidationDate(parseUnits("1000", 18), parseUnits("2000", 18), 0n)).toBeNull();
  });

  it("returns the current date when debt already meets or exceeds threshold", () => {
    const now = Date.now();
    const result = computeLiquidationDate(parseUnits("2000", 18), parseUnits("1000", 18), rate5pct);
    expect(result).not.toBeNull();
    expect(result!.getTime()).toBeLessThanOrEqual(now + 1000);
  });

  it("returns a future date proportional to ln(threshold/debt) / rate", () => {
    const now = Date.now();
    // debt:threshold = 1:2 with ~5% rate → t ≈ ln(2)/0.05 ≈ 13.86 years
    const result = computeLiquidationDate(parseUnits("1000", 18), parseUnits("2000", 18), rate5pct);
    expect(result).not.toBeNull();
    const yearsUntilLiquidation = (result!.getTime() - now) / (365 * 24 * 60 * 60 * 1000);
    expect(yearsUntilLiquidation).toBeGreaterThan(10);
    expect(yearsUntilLiquidation).toBeLessThan(20);
  });
});
