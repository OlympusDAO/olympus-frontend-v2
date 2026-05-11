import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatUnits, parseUnits, type Address } from "viem";
import { useAccount } from "wagmi";
import type { CoolerLoan } from "@/lib/hooks/cooler/useGetCoolerLoans";
import type { ClearingHouseData } from "@/lib/hooks/cooler/useGetClearingHouse";
import { useRepayLegacyLoan } from "@/lib/hooks/cooler/useRepayLegacyLoan";
import { useTokenAllowance } from "@/lib/hooks/useTokenAllowance";
import { useTokenApproval } from "@/lib/hooks/useTokenApproval";
import { formatAmount, formatDate } from "../utils/format";

interface RepayLegacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: CoolerLoan | null;
  coolerAddress: string;
  debtAddress: string;
  clearingHouseData: ClearingHouseData | null;
}

export function V1RepayLegacyModal({
  isOpen,
  onClose,
  loan,
  coolerAddress,
  debtAddress,
  clearingHouseData,
}: RepayLegacyModalProps) {
  const { address } = useAccount();
  const [repayAmount, setRepayAmount] = useState("");

  const { repay, isPending: isRepayPending } = useRepayLegacyLoan();

  const repayAmountBigInt = useMemo(() => {
    if (!repayAmount || Number.isNaN(Number(repayAmount))) return 0n;
    try {
      return parseUnits(repayAmount, 18);
    } catch {
      return 0n;
    }
  }, [repayAmount]);

  const { allowance, queryKey: allowanceQueryKey } = useTokenAllowance(
    debtAddress as Address,
    address,
    coolerAddress as Address,
  );

  const { approve, isPending: isApprovePending } = useTokenApproval();

  const needsApproval = useMemo(() => {
    if (allowance === undefined || repayAmountBigInt === 0n) return false;
    return allowance < repayAmountBigInt;
  }, [allowance, repayAmountBigInt]);

  const collateralReturned = useMemo(() => {
    if (!loan || repayAmountBigInt === 0n || loan.principal === 0n) return 0n;
    const totalDebt = loan.principal + loan.interestDue;
    const cappedRepay = repayAmountBigInt > totalDebt ? totalDebt : repayAmountBigInt;
    if (cappedRepay <= loan.interestDue) return 0n;
    const principalPortion = cappedRepay - loan.interestDue;
    return (loan.collateral * principalPortion) / loan.principal;
  }, [loan, repayAmountBigInt]);

  const debtAsset = loan?.debtAssetName ?? clearingHouseData?.debtAssetName ?? "DAI";

  const handleApprove = () => {
    if (!debtAddress || !coolerAddress) return;
    approve({
      tokenAddress: debtAddress as Address,
      spender: coolerAddress as Address,
      amount: repayAmountBigInt,
      queryKey: allowanceQueryKey,
    });
  };

  const handleRepay = () => {
    if (!loan || repayAmountBigInt === 0n) return;
    repay(coolerAddress as Address, loan.loanId, repayAmountBigInt);
  };

  const handleSetMax = () => {
    if (!loan) return;
    const maxRepay = loan.principal + loan.interestDue;
    setRepayAmount(formatUnits(maxRepay, 18));
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setRepayAmount("");
      onClose();
    }
  };

  if (!loan) return null;

  const interestRate = Number(formatUnits(loan.request.interest, 16));
  const repaymentTotal = loan.principal + loan.interestDue;
  const loanToCollateral = clearingHouseData?.loanToCollateral ?? "0";

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full sm:max-w-md mx-auto p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl">Repay Loan</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          <div className="bg-surface-a3 rounded-3xl p-4 border border-a3-b">
            <div className="flex items-center justify-between mb-3">
              <label htmlFor="repay-amount" className="text-sm font-medium">
                Repay Amount
              </label>
              <span className="text-xs text-secondary-t">{debtAsset}</span>
            </div>
            <div className="flex items-center justify-between">
              <Input
                id="repay-amount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={repayAmount}
                onChange={(e) => setRepayAmount(e.target.value)}
                className="md:text-3xl h-12 placeholder:text-disabled-t border-0 shadow-none pl-0 bg-transparent"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSetMax}
                className="h-7 px-3 text-xs"
              >
                Max
              </Button>
            </div>
            <div className="flex items-center justify-end text-xs text-secondary-t mt-2">
              <span>
                Repayment: {formatAmount(repaymentTotal)} {debtAsset}
              </span>
            </div>
          </div>

          <div className="bg-surface-a3 rounded-3xl p-4 border border-a3-b">
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-secondary-t">Interest Rate</span>
                <span>{interestRate.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-t">Maturity Date</span>
                <span>{formatDate(loan.expiry)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-t">Collateral</span>
                <span>{formatAmount(loan.collateral)} gOHM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-t">Loan to Value per gOHM</span>
                <span>
                  {Number(loanToCollateral).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  {debtAsset}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-t">Principal</span>
                <span>
                  {formatAmount(loan.principal)} {debtAsset}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-t">Interest Due</span>
                <span>
                  {formatAmount(loan.interestDue)} {debtAsset}
                </span>
              </div>
              <div className="border-a5-b flex justify-between border-t pt-2 mt-1 font-semibold">
                <span>gOHM Returned</span>
                <span>{formatAmount(collateralReturned)} gOHM</span>
              </div>
            </div>
          </div>

          {needsApproval ? (
            <Button
              onClick={handleApprove}
              disabled={isApprovePending || repayAmountBigInt === 0n}
              className="w-full"
              size="lg"
            >
              {isApprovePending ? "Approving..." : `Approve ${debtAsset}`}
            </Button>
          ) : (
            <Button
              onClick={handleRepay}
              disabled={isRepayPending || repayAmountBigInt === 0n}
              className="w-full"
              size="lg"
            >
              {isRepayPending ? "Repaying..." : "Repay"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
