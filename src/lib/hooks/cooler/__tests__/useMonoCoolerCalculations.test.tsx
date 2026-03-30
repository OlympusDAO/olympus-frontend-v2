import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseUnits } from "viem";
import { act } from "@testing-library/react";
import { renderHookWithProviders } from "@/test/test-utils";
import { useMonoCoolerCalculations } from "../useMonoCoolerCalculations";

// Mock wagmi
vi.mock("wagmi", () => ({
  useAccount: () => ({ address: "0x1234567890abcdef1234567890abcdef12345678" }),
  useChainId: () => 1,
  useReadContracts: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn(), queryKey: [] }),
  useReadContract: () => ({ data: undefined }),
  usePublicClient: () => null,
}));

const mockPosition = {
  collateral: parseUnits("10", 18),
  currentDebt: parseUnits("5000", 18),
  maxOriginationDebtAmount: parseUnits("7000", 18),
  liquidationDebtAmount: parseUnits("8500", 18),
  healthFactor: parseUnits("1.7", 18),
  currentLtv: parseUnits("0.5", 18),
  totalDelegated: 0n,
  numDelegateAddresses: 0n,
  maxDelegateAddresses: 10n,
  interestRateWad: parseUnits("0.04879", 18),
  interestRateBps: 500,
  maxOriginationLtv: parseUnits("0.7", 18),
  liquidationLtv: parseUnits("0.85", 18),
  debtAssetName: "USDS",
  collateralAssetName: "gOHM",
  debtAddress: "0xdebt" as `0x${string}`,
  collateralAddress: "0xcollateral" as `0x${string}`,
  borrowsPaused: false,
  isActive: true,
  isEnabled: true,
  projectedLiquidationDate: null,
};

// Mock useMonoCoolerPosition
vi.mock("../useMonoCoolerPosition", () => ({
  useMonoCoolerPosition: () => ({
    position: mockPosition,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    queryKey: ["test"],
  }),
}));

// Mock useTokenBalance
vi.mock("@/lib/hooks/useTokenBalance", () => ({
  useTokenBalance: () => ({ balance: parseUnits("100", 18) }),
}));

describe("useMonoCoolerCalculations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state (no existing loan, borrow mode)", () => {
    it("starts with zero amounts and 100% LTV", () => {
      const { result } = renderHookWithProviders(() =>
        useMonoCoolerCalculations({ isRepayMode: false }),
      );

      expect(result.current.collateralAmount).toBe(0n);
      expect(result.current.borrowAmount).toBe(0n);
      expect(result.current.ltvPercentage).toBe(100);
    });

    it("currentDebt is zero with no loan", () => {
      const { result } = renderHookWithProviders(() =>
        useMonoCoolerCalculations({ isRepayMode: false }),
      );

      expect(result.current.currentDebt).toBe(0n);
    });

    it("isBelowMinDebt is false when no amounts entered", () => {
      const { result } = renderHookWithProviders(() =>
        useMonoCoolerCalculations({ isRepayMode: false }),
      );

      expect(result.current.isBelowMinDebt).toBe(false);
    });
  });

  describe("handleCollateralChange", () => {
    it("updates collateral and recalculates borrow amount", () => {
      const { result } = renderHookWithProviders(() =>
        useMonoCoolerCalculations({ isRepayMode: false }),
      );

      act(() => {
        result.current.handleCollateralChange(parseUnits("10", 18));
      });

      expect(result.current.collateralAmount).toBe(parseUnits("10", 18));
      // At 100% LTV with 0.7 maxOriginationLtv:
      // borrowAmount = 10 * 0.7 * 1.0 = 7 (minus small interest buffer)
      expect(result.current.borrowAmount).toBeGreaterThan(0n);
      expect(result.current.borrowAmount).toBeLessThanOrEqual(parseUnits("7", 18));
    });
  });

  describe("handleDebtChange", () => {
    it("updates borrow amount and LTV percentage", () => {
      const { result } = renderHookWithProviders(() =>
        useMonoCoolerCalculations({ isRepayMode: false }),
      );

      // First set collateral
      act(() => {
        result.current.handleCollateralChange(parseUnits("10", 18));
      });

      // Then manually set borrow amount
      act(() => {
        result.current.handleDebtChange(parseUnits("3.5", 18));
      });

      expect(result.current.borrowAmount).toBe(parseUnits("3.5", 18));
      // LTV should update: 3.5 / (10 * 0.7) = 0.5 = 50%
      expect(result.current.ltvPercentage).toBeCloseTo(50, 0);
    });
  });

  describe("repay mode", () => {
    const existingLoan = {
      debt: parseUnits("5000", 18),
      collateral: parseUnits("10", 18),
    };

    it("initializes borrowAmount to current debt in repay mode", () => {
      const { result } = renderHookWithProviders(() =>
        useMonoCoolerCalculations({ loan: existingLoan, isRepayMode: true }),
      );

      expect(result.current.borrowAmount).toBe(existingLoan.debt);
    });

    it("caps repay amount at current debt", () => {
      const { result } = renderHookWithProviders(() =>
        useMonoCoolerCalculations({ loan: existingLoan, isRepayMode: true }),
      );

      act(() => {
        result.current.handleDebtChange(parseUnits("999999", 18));
      });

      // Should be capped at current debt
      expect(result.current.borrowAmount).toBe(existingLoan.debt);
    });

    it("calculates collateral to be released", () => {
      const { result } = renderHookWithProviders(() =>
        useMonoCoolerCalculations({ loan: existingLoan, isRepayMode: true }),
      );

      // Full repay at 100% LTV → all collateral released
      expect(result.current.collateralToBeReleased).toBe(existingLoan.collateral);
    });

    it("projects zero debt on full repay", () => {
      const { result } = renderHookWithProviders(() =>
        useMonoCoolerCalculations({ loan: existingLoan, isRepayMode: true }),
      );

      // Full repay → projected debt = 0
      expect(result.current.projectedDebt).toBe(0n);
    });
  });

  describe("resetState", () => {
    it("resets all state to initial values", () => {
      const { result } = renderHookWithProviders(() =>
        useMonoCoolerCalculations({ isRepayMode: false }),
      );

      // Change state
      act(() => {
        result.current.handleCollateralChange(parseUnits("5", 18));
      });

      expect(result.current.collateralAmount).toBe(parseUnits("5", 18));

      // Reset
      act(() => {
        result.current.resetState();
      });

      expect(result.current.collateralAmount).toBe(0n);
      expect(result.current.borrowAmount).toBe(0n);
      expect(result.current.ltvPercentage).toBe(100);
    });
  });

  describe("projected values with existing loan", () => {
    const existingLoan = {
      debt: parseUnits("5000", 18),
      collateral: parseUnits("10", 18),
    };

    it("projects debt as current + new borrow in borrow mode", () => {
      const { result } = renderHookWithProviders(() =>
        useMonoCoolerCalculations({ loan: existingLoan, isRepayMode: false }),
      );

      // projectedDebt = currentDebt + borrowAmount
      expect(result.current.projectedDebt).toBe(
        existingLoan.debt + result.current.borrowAmount,
      );
    });

    it("projects collateral as existing + new in borrow mode", () => {
      const { result } = renderHookWithProviders(() =>
        useMonoCoolerCalculations({ loan: existingLoan, isRepayMode: false }),
      );

      act(() => {
        result.current.handleCollateralChange(parseUnits("2", 18));
      });

      expect(result.current.projectedCollateral).toBe(
        existingLoan.collateral + parseUnits("2", 18),
      );
    });

    it("additionalBorrowingAvailable reflects max - current", () => {
      const { result } = renderHookWithProviders(() =>
        useMonoCoolerCalculations({ loan: existingLoan, isRepayMode: false }),
      );

      // maxPotentialBorrowAmount = 10 * 0.7 = 7 USDS (in WAD)
      // currentDebt = 5000 USDS
      // additional = 7 - 5000 = negative → 0 (since loan collateral is 10 gOHM worth ~7000 USDS at 0.7 LTV)
      const maxBorrow = result.current.maxPotentialBorrowAmount;
      const expected = maxBorrow > existingLoan.debt ? maxBorrow - existingLoan.debt : 0n;
      expect(result.current.additionalBorrowingAvailable).toBe(expected);
    });
  });
});
