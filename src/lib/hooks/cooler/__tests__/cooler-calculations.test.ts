import { describe, it, expect } from "vitest";
import { parseUnits } from "viem";
import { wmul, wdiv, pctToWad } from "@/lib/utils/wad-math";

const ZERO = 0n;
const MIN_DEBT = parseUnits("1000", 18);

describe("WAD math utilities", () => {
  it("wmul: multiplies two WAD values correctly", () => {
    const a = parseUnits("2", 18); // 2.0
    const b = parseUnits("3", 18); // 3.0
    const result = wmul(a, b);
    expect(result).toBe(parseUnits("6", 18)); // 6.0
  });

  it("wmul: handles fractional values", () => {
    const a = parseUnits("1.5", 18);
    const b = parseUnits("0.5", 18);
    const result = wmul(a, b);
    expect(result).toBe(parseUnits("0.75", 18));
  });

  it("wdiv: divides two WAD values correctly", () => {
    const a = parseUnits("6", 18);
    const b = parseUnits("3", 18);
    const result = wdiv(a, b);
    expect(result).toBe(parseUnits("2", 18));
  });

  it("wdiv: returns zero when dividing by zero", () => {
    expect(wdiv(parseUnits("1", 18), ZERO)).toBe(ZERO);
  });

  it("pctToWad: converts percentage to WAD fraction", () => {
    const result = pctToWad(100);
    expect(result).toBe(parseUnits("1", 18));
  });

  it("pctToWad: converts 50% correctly", () => {
    const result = pctToWad(50);
    expect(result).toBe(parseUnits("0.5", 18));
  });
});

describe("Borrow amount calculations", () => {
  const maxOriginationLtv = parseUnits("0.7", 18); // 70% LTV

  it("calculates borrow amount from collateral and LTV", () => {
    const collateral = parseUnits("10", 18); // 10 gOHM
    const ltvPct = 100;
    const pctWad = pctToWad(ltvPct);
    const borrowAmount = wmul(wmul(collateral, maxOriginationLtv), pctWad);
    // 10 * 0.7 * 1.0 = 7
    expect(borrowAmount).toBe(parseUnits("7", 18));
  });

  it("calculates partial LTV borrow amount", () => {
    const collateral = parseUnits("10", 18);
    const ltvPct = 50;
    const pctWad = pctToWad(ltvPct);
    const borrowAmount = wmul(wmul(collateral, maxOriginationLtv), pctWad);
    // 10 * 0.7 * 0.5 = 3.5
    expect(borrowAmount).toBe(parseUnits("3.5", 18));
  });

  it("calculates zero borrow at 0% LTV", () => {
    const collateral = parseUnits("10", 18);
    const pctWad = pctToWad(0);
    const borrowAmount = wmul(wmul(collateral, maxOriginationLtv), pctWad);
    expect(borrowAmount).toBe(ZERO);
  });
});

describe("Repay and collateral release calculations", () => {
  it("calculates collateral to be released on full repay", () => {
    const existingDebt = parseUnits("7000", 18);
    const existingCollateral = parseUnits("10", 18);
    const repayAmount = existingDebt; // Full repay

    const repaymentRatio = wdiv(repayAmount, existingDebt);
    const maxCollateralToWithdraw = wmul(existingCollateral, repaymentRatio);
    // Full repay = 100% collateral release
    expect(maxCollateralToWithdraw).toBe(existingCollateral);
  });

  it("calculates partial collateral release", () => {
    const existingDebt = parseUnits("7000", 18);
    const existingCollateral = parseUnits("10", 18);
    const repayAmount = parseUnits("3500", 18); // 50% repay

    const repaymentRatio = wdiv(repayAmount, existingDebt);
    const maxCollateralToWithdraw = wmul(existingCollateral, repaymentRatio);
    // 50% repay → 5 gOHM can be withdrawn
    expect(maxCollateralToWithdraw).toBe(parseUnits("5", 18));
  });
});

describe("Projected values", () => {
  it("projected debt in borrow mode = current + new", () => {
    const currentDebt = parseUnits("5000", 18);
    const borrowAmount = parseUnits("2000", 18);
    const projectedDebt = currentDebt + borrowAmount;
    expect(projectedDebt).toBe(parseUnits("7000", 18));
  });

  it("projected debt in repay mode = current - repay (clamped to 0)", () => {
    const currentDebt = parseUnits("5000", 18);
    const repayAmount = parseUnits("3000", 18);
    const projectedDebt = currentDebt > repayAmount ? currentDebt - repayAmount : ZERO;
    expect(projectedDebt).toBe(parseUnits("2000", 18));
  });

  it("projected debt never goes negative", () => {
    const currentDebt = parseUnits("1000", 18);
    const repayAmount = parseUnits("2000", 18);
    const projectedDebt = currentDebt > repayAmount ? currentDebt - repayAmount : ZERO;
    expect(projectedDebt).toBe(ZERO);
  });

  it("projected collateral in borrow mode = existing + new", () => {
    const existingCollateral = parseUnits("5", 18);
    const newCollateral = parseUnits("3", 18);
    const projectedCollateral = existingCollateral + newCollateral;
    expect(projectedCollateral).toBe(parseUnits("8", 18));
  });
});

describe("Liquidation threshold", () => {
  it("calculates liquidation threshold from collateral and LTV", () => {
    const liquidationLtv = parseUnits("0.85", 18); // 85%
    const collateral = parseUnits("10", 18);
    const threshold = wmul(collateral, liquidationLtv);
    expect(threshold).toBe(parseUnits("8.5", 18));
  });
});

describe("Additional borrowing available", () => {
  it("calculates available borrowing correctly", () => {
    const maxPotentialBorrowAmount = parseUnits("7000", 18);
    const currentDebt = parseUnits("3000", 18);
    const available =
      maxPotentialBorrowAmount > currentDebt ? maxPotentialBorrowAmount - currentDebt : ZERO;
    expect(available).toBe(parseUnits("4000", 18));
  });

  it("returns zero when at max capacity", () => {
    const maxPotentialBorrowAmount = parseUnits("7000", 18);
    const currentDebt = parseUnits("7000", 18);
    const available =
      maxPotentialBorrowAmount > currentDebt ? maxPotentialBorrowAmount - currentDebt : ZERO;
    expect(available).toBe(ZERO);
  });

  it("returns zero when over-borrowed", () => {
    const maxPotentialBorrowAmount = parseUnits("7000", 18);
    const currentDebt = parseUnits("8000", 18);
    const available =
      maxPotentialBorrowAmount > currentDebt ? maxPotentialBorrowAmount - currentDebt : ZERO;
    expect(available).toBe(ZERO);
  });
});

describe("Minimum debt enforcement", () => {
  it("detects projected debt below minimum", () => {
    const projectedDebt = parseUnits("500", 18);
    const isBelowMinDebt = projectedDebt > ZERO && projectedDebt < MIN_DEBT;
    expect(isBelowMinDebt).toBe(true);
  });

  it("passes when projected debt is at minimum", () => {
    const projectedDebt = parseUnits("1000", 18);
    const isBelowMinDebt = projectedDebt > ZERO && projectedDebt < MIN_DEBT;
    expect(isBelowMinDebt).toBe(false);
  });

  it("passes when projected debt is zero (fully repaid)", () => {
    const projectedDebt = ZERO;
    const isBelowMinDebt = projectedDebt > ZERO && projectedDebt < MIN_DEBT;
    expect(isBelowMinDebt).toBe(false);
  });

  it("passes when projected debt is above minimum", () => {
    const projectedDebt = parseUnits("5000", 18);
    const isBelowMinDebt = projectedDebt > ZERO && projectedDebt < MIN_DEBT;
    expect(isBelowMinDebt).toBe(false);
  });
});
