import { useMemo, useState, useEffect, useRef } from "react";
import { parseUnits, formatUnits } from "viem";
import { useMonoCoolerPosition } from "./useMonoCoolerPosition";
import { useTokenBalance } from "@/lib/hooks/useTokenBalance";
import { WAD, wmul, wdiv, pctToWad } from "@/lib/utils/wad-math";

const ZERO = 0n;
const MIN_DEBT = parseUnits("1000", 18);

interface UseMonoCoolerCalculationsProps {
  loan?: {
    debt: bigint;
    collateral: bigint;
  };
  isRepayMode: boolean;
}

export function useMonoCoolerCalculations({ loan, isRepayMode }: UseMonoCoolerCalculationsProps) {
  const { position } = useMonoCoolerPosition();

  const collateralAddress = position?.collateralAddress;
  const { balance: collateralBalance } = useTokenBalance(collateralAddress, undefined);

  // Hourly interest rate as a number
  const hourlyInterestRate = useMemo(() => {
    if (!position?.interestRateBps) return 0;
    return position.interestRateBps / 10000 / 8760;
  }, [position?.interestRateBps]);

  const [collateralAmount, setCollateralAmount] = useState(ZERO);

  const [borrowAmount, setBorrowAmount] = useState<bigint>(ZERO);
  const [ltvPercentage, setLtvPercentage] = useState(100);

  // Recalculate initial borrowAmount when position data first becomes available
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (hasInitialized.current) return;
    if (!loan || !position?.maxOriginationLtv || hourlyInterestRate === 0) return;

    hasInitialized.current = true;

    if (isRepayMode) {
      setBorrowAmount(loan.debt);
      return;
    }

    const maxBorrow = wmul(loan.collateral, position.maxOriginationLtv);
    const additionalBorrowing = maxBorrow - loan.debt;

    const oneHourInterestWad = parseUnits(hourlyInterestRate.toFixed(18), 18);
    const oneHourInterest = wmul(loan.debt, oneHourInterestWad);

    setBorrowAmount(additionalBorrowing > oneHourInterest ? additionalBorrowing : ZERO);
  }, [loan, position?.maxOriginationLtv, hourlyInterestRate, isRepayMode]);

  // Current debt
  const currentDebt = useMemo(() => {
    return loan?.debt ?? ZERO;
  }, [loan]);

  // Max potential borrow amount
  const maxPotentialBorrowAmount = useMemo(() => {
    if (!position?.maxOriginationLtv) return ZERO;

    if (!loan) {
      if (!collateralBalance) return ZERO;
      return wmul(collateralBalance, position.maxOriginationLtv);
    }

    return wmul(loan.collateral, position.maxOriginationLtv);
  }, [position?.maxOriginationLtv, loan, collateralBalance]);

  // Liquidation threshold
  const liquidationThreshold = useMemo(() => {
    if (!position?.liquidationLtv) return ZERO;

    if (isRepayMode && loan) {
      const existingCollateral = loan.collateral;
      if (currentDebt === ZERO) return ZERO;
      const repaymentRatio = wdiv(borrowAmount, currentDebt);
      const remainingCollateral = existingCollateral - wmul(existingCollateral, repaymentRatio);
      return wmul(remainingCollateral, position.liquidationLtv);
    }

    const existingCollateral = loan?.collateral ?? ZERO;
    const totalCollateral = existingCollateral + collateralAmount;
    return wmul(totalCollateral, position.liquidationLtv);
  }, [loan, collateralAmount, position?.liquidationLtv, isRepayMode, borrowAmount, currentDebt]);

  // Collateral to be released (repay mode)
  const collateralToBeReleased = useMemo(() => {
    if (!loan || !position?.maxOriginationLtv) return ZERO;

    if (isRepayMode) {
      const existingDebt = loan.debt;
      const repaymentRatio = existingDebt > ZERO ? wdiv(borrowAmount, existingDebt) : WAD;
      const maxCollateralToWithdraw = wmul(loan.collateral, repaymentRatio);

      const withdrawRatio = pctToWad(ltvPercentage);
      return wmul(maxCollateralToWithdraw, withdrawRatio);
    }

    if (loan.debt === ZERO) return loan.collateral;
    const repaymentRatio = wdiv(borrowAmount, loan.debt);
    return wmul(loan.collateral, repaymentRatio);
  }, [loan, borrowAmount, position?.maxOriginationLtv, isRepayMode, ltvPercentage]);

  // One hour interest
  const oneHourInterest = useMemo(() => {
    if (currentDebt === ZERO || hourlyInterestRate === 0) return ZERO;
    const rateWad = parseUnits(hourlyInterestRate.toFixed(18), 18);
    return wmul(currentDebt, rateWad);
  }, [hourlyInterestRate, currentDebt]);

  // Projected values
  const projectedDebt = useMemo(() => {
    if (isRepayMode) {
      return currentDebt > borrowAmount ? currentDebt - borrowAmount : ZERO;
    }
    if (!loan) return borrowAmount;
    return currentDebt + borrowAmount;
  }, [isRepayMode, currentDebt, borrowAmount, loan]);

  const projectedCollateral = useMemo(() => {
    if (isRepayMode) {
      if (!loan) return ZERO;
      const remaining = loan.collateral - collateralToBeReleased;
      return remaining > ZERO ? remaining : ZERO;
    }
    if (!loan) return collateralAmount;
    return loan.collateral + collateralAmount;
  }, [loan, isRepayMode, collateralAmount, collateralToBeReleased]);

  // Additional borrowing available
  const additionalBorrowingAvailable = useMemo(() => {
    return maxPotentialBorrowAmount > currentDebt ? maxPotentialBorrowAmount - currentDebt : ZERO;
  }, [maxPotentialBorrowAmount, currentDebt]);

  // Is projected debt below minimum?
  const isBelowMinDebt = projectedDebt > ZERO && projectedDebt < MIN_DEBT;

  // Handlers
  const handleLtvChange = (value: number) => {
    if (isRepayMode) {
      handleRepayLtvChange(value);
    } else {
      handleBorrowLtvChange(value);
    }
  };

  const handleRepayLtvChange = (value: number) => {
    if (!position?.maxOriginationLtv || !loan) return;
    setLtvPercentage(value);
  };

  const handleBorrowLtvChange = (value: number) => {
    if (!position?.maxOriginationLtv || hourlyInterestRate === 0) return;

    const maxLtv = position.maxOriginationLtv;

    if (loan) {
      const existingCollateral = loan.collateral;
      const totalCollateral = existingCollateral + collateralAmount;

      const minLtvPct = Number(formatUnits(wdiv(currentDebt, wmul(totalCollateral, maxLtv)), 18)) * 100;
      const adjustedValue = Math.max(value, minLtvPct);
      setLtvPercentage(adjustedValue);

      if (adjustedValue <= minLtvPct) {
        setBorrowAmount(ZERO);
        return;
      }

      const pctWad = pctToWad(adjustedValue);
      const maxBorrowAmount = wmul(wmul(totalCollateral, maxLtv), pctWad);
      const additionalBorrowing = maxBorrowAmount > currentDebt ? maxBorrowAmount - currentDebt : ZERO;

      if (value === 100) {
        const rateWad = parseUnits(hourlyInterestRate.toFixed(18), 18);
        const hourInterest = wmul(currentDebt, rateWad);
        setBorrowAmount(additionalBorrowing > hourInterest ? additionalBorrowing - hourInterest : ZERO);
      } else {
        setBorrowAmount(additionalBorrowing);
      }
    } else {
      setLtvPercentage(value);
      const pctWad = pctToWad(value);
      let newBorrowAmount = wmul(wmul(collateralAmount, maxLtv), pctWad);

      if (value === 100) {
        const rateWad = parseUnits(hourlyInterestRate.toFixed(18), 18);
        const hourInterest = wmul(newBorrowAmount, rateWad);
        newBorrowAmount = newBorrowAmount > hourInterest ? newBorrowAmount - hourInterest : ZERO;
      }

      setBorrowAmount(newBorrowAmount);
    }
  };

  const handleCollateralChange = (value: bigint) => {
    setCollateralAmount(value);
    if (position?.maxOriginationLtv && !isRepayMode) {
      const pctWad = pctToWad(ltvPercentage);
      const newBorrowAmount = wmul(wmul(value, position.maxOriginationLtv), pctWad);
      setBorrowAmount(newBorrowAmount);
    }
  };

  const handleDebtChange = (value: bigint) => {
    if (isRepayMode) {
      const maxRepayment = currentDebt;
      setBorrowAmount(value > maxRepayment ? maxRepayment : value);
    } else {
      setBorrowAmount(value);

      if (!position?.maxOriginationLtv) return;
      const maxLtv = position.maxOriginationLtv;

      if (loan) {
        const existingCollateral = loan.collateral;
        const totalCollateral = existingCollateral + collateralAmount;
        const totalDebt = currentDebt + value;
        const newLtvPct = Number(formatUnits(wdiv(totalDebt, wmul(totalCollateral, maxLtv)), 18)) * 100;
        setLtvPercentage(Math.min(newLtvPct, 100));
      } else {
        if (collateralAmount > ZERO) {
          const newLtvPct = Number(formatUnits(wdiv(value, wmul(collateralAmount, maxLtv)), 18)) * 100;
          setLtvPercentage(Math.min(newLtvPct, 100));
        }
      }
    }
  };

  const resetState = () => {
    setCollateralAmount(ZERO);
    setBorrowAmount(ZERO);
    setLtvPercentage(100);
  };

  return {
    // State
    collateralAmount,
    borrowAmount,
    ltvPercentage,

    // Calculations
    currentDebt,
    maxPotentialBorrowAmount,
    liquidationThreshold,
    collateralToBeReleased,
    oneHourInterest,
    projectedDebt,
    projectedCollateral,
    additionalBorrowingAvailable,
    isBelowMinDebt,

    // State handlers
    handleLtvChange,
    handleCollateralChange,
    handleDebtChange,
    resetState,
  };
}
