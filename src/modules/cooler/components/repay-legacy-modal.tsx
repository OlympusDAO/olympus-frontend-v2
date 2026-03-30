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

interface RepayLegacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: CoolerLoan | null;
  coolerAddress: string;
  debtAddress: string;
  clearingHouseData: ClearingHouseData | null;
}

function formatAmount(value: bigint, decimals: number = 2): string {
  const num = Number(formatUnits(value, 18));
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatDate(expiry: bigint): string {
  const date = new Date(Number(expiry) * 1000);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function RepayLegacyModal({
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
    if (!allowance || repayAmountBigInt === 0n) return false;
    return allowance < repayAmountBigInt;
  }, [allowance, repayAmountBigInt]);

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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Repay Loan</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-xs text-secondary-t">
                Repay Amount ({debtAsset})
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                />
                <Button variant="secondary" size="sm" onClick={handleSetMax}>
                  Max
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {needsApproval ? (
                <Button onClick={handleApprove} disabled={isApprovePending || repayAmountBigInt === 0n}>
                  {isApprovePending ? "Approving..." : `Approve ${debtAsset}`}
                </Button>
              ) : (
                <Button onClick={handleRepay} disabled={isRepayPending || repayAmountBigInt === 0n}>
                  {isRepayPending ? "Repaying..." : "Repay"}
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold">Position Info</h4>
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
                <span>{Number(loanToCollateral).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {debtAsset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-t">Principal</span>
                <span>{formatAmount(loan.principal)} {debtAsset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-t">Interest Due</span>
                <span>{formatAmount(loan.interestDue)} {debtAsset}</span>
              </div>
              <div className="border-a5-b flex justify-between border-t pt-2 font-semibold">
                <span className="text-secondary-t">Repayment</span>
                <span>{formatAmount(repaymentTotal)} {debtAsset}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
