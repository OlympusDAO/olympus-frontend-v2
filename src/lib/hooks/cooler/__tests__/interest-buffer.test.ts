import { describe, it, expect } from "vitest";
import { calculateBorrowAmount, calculateRepayAmount } from "../useMonoCoolerDebt";

describe("calculateBorrowAmount", () => {
  // 5% annual rate = 500 bps
  const interestRateBps = 500;

  it("subtracts 1-hour interest buffer from borrow amount", () => {
    const amount = 10000n * 10n ** 18n; // 10,000 USDS
    const result = calculateBorrowAmount(amount, interestRateBps);
    // Hourly rate = 500 / 10000 / 8760 ≈ 0.0000057078
    // Buffer = 10000 * 0.0000057078 ≈ 0.057078 USDS
    // Result should be slightly less than 10,000
    expect(result).toBeLessThan(amount);
    expect(result).toBeGreaterThan(amount - 10n ** 18n); // Less than 1 USDS buffer
  });

  it("returns 0 for zero amount", () => {
    expect(calculateBorrowAmount(0n, interestRateBps)).toBe(0n);
  });

  it("handles small amounts correctly", () => {
    const amount = 1n * 10n ** 18n; // 1 USDS
    const result = calculateBorrowAmount(amount, interestRateBps);
    expect(result).toBeLessThan(amount);
    expect(result).toBeGreaterThan(0n);
  });

  it("handles high interest rate", () => {
    const amount = 1000n * 10n ** 18n;
    const highRate = 5000; // 50% annual
    const result = calculateBorrowAmount(amount, highRate);
    expect(result).toBeLessThan(amount);
    // Buffer should be proportionally larger
    const normalResult = calculateBorrowAmount(amount, interestRateBps);
    expect(amount - result).toBeGreaterThan(amount - normalResult);
  });
});

describe("calculateRepayAmount", () => {
  const interestRateBps = 500;

  it("adds 1-hour buffer when fullRepay is true", () => {
    const amount = 10000n * 10n ** 18n;
    const result = calculateRepayAmount(amount, interestRateBps, true);
    expect(result).toBeGreaterThan(amount);
    expect(result).toBeLessThan(amount + 10n ** 18n); // Less than 1 USDS buffer
  });

  it("returns amount unchanged when fullRepay is false", () => {
    const amount = 10000n * 10n ** 18n;
    const result = calculateRepayAmount(amount, interestRateBps, false);
    expect(result).toBe(amount);
  });

  it("returns 0 for zero amount regardless of fullRepay", () => {
    expect(calculateRepayAmount(0n, interestRateBps, true)).toBe(0n);
    expect(calculateRepayAmount(0n, interestRateBps, false)).toBe(0n);
  });

  it("buffer is symmetric with borrow buffer", () => {
    const amount = 5000n * 10n ** 18n;
    const borrowResult = calculateBorrowAmount(amount, interestRateBps);
    const borrowBuffer = amount - borrowResult;

    const repayResult = calculateRepayAmount(amount, interestRateBps, true);
    const repayBuffer = repayResult - amount;

    // Buffers should be equal since they use the same formula
    expect(repayBuffer).toBe(borrowBuffer);
  });
});
