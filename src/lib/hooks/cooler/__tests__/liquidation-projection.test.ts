import { describe, it, expect } from "vitest";
import {
  calculateInterestRateBps,
  calculateProjectedLiquidationDate,
} from "../useMonoCoolerPosition";
import { parseUnits } from "viem";

describe("calculateInterestRateBps", () => {
  it("converts WAD interest rate to basis points", () => {
    // ln(1 + 0.05) ≈ 0.04879 → 0.04879e18 WAD
    // exp(0.04879) - 1 ≈ 0.05 → 500 bps
    const interestRateWad = parseUnits("0.04879016416943205", 18);
    const bps = calculateInterestRateBps(interestRateWad);
    expect(bps).toBe(500); // 5%
  });

  it("handles zero rate", () => {
    const bps = calculateInterestRateBps(0n);
    expect(bps).toBe(0);
  });

  it("handles small rates", () => {
    // ~0.5% annual rate
    const interestRateWad = parseUnits("0.004987541511038553", 18);
    const bps = calculateInterestRateBps(interestRateWad);
    expect(bps).toBe(50); // 0.5%
  });
});

describe("calculateProjectedLiquidationDate", () => {
  it("returns null when no debt", () => {
    const result = calculateProjectedLiquidationDate(
      0n,
      parseUnits("1", 18),
      parseUnits("0.04879", 18),
      0n,
      parseUnits("0.8", 18),
    );
    expect(result).toBeNull();
  });

  it("returns null when no collateral", () => {
    const result = calculateProjectedLiquidationDate(
      parseUnits("1000", 18),
      0n,
      parseUnits("0.04879", 18),
      parseUnits("0.5", 18),
      parseUnits("0.8", 18),
    );
    expect(result).toBeNull();
  });

  it("returns current date when already at liquidation", () => {
    const now = Date.now();
    const result = calculateProjectedLiquidationDate(
      parseUnits("1000", 18),
      parseUnits("1", 18),
      parseUnits("0.04879", 18),
      parseUnits("0.9", 18), // currentLtv
      parseUnits("0.8", 18), // liquidationLtv (lower = already past)
    );
    expect(result).not.toBeNull();
    expect(result!.getTime()).toBeLessThanOrEqual(now + 1000);
  });

  it("returns future date when LTV is below liquidation", () => {
    const now = Date.now();
    const result = calculateProjectedLiquidationDate(
      parseUnits("1000", 18),
      parseUnits("10", 18),
      parseUnits("0.04879", 18), // ~5% annual
      parseUnits("0.4", 18), // currentLtv = 40%
      parseUnits("0.8", 18), // liquidationLtv = 80%
    );
    expect(result).not.toBeNull();
    expect(result!.getTime()).toBeGreaterThan(now);
    // With 5% rate, going from 40% to 80% LTV: t = ln(0.8/0.4) / 0.05 ≈ 13.86 years
    const yearsUntilLiquidation = (result!.getTime() - now) / (365 * 24 * 60 * 60 * 1000);
    expect(yearsUntilLiquidation).toBeGreaterThan(10);
    expect(yearsUntilLiquidation).toBeLessThan(20);
  });
});
