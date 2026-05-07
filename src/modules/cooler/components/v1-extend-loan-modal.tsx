import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatUnits, parseUnits, type Address } from "viem";
import { formatTokenAmount } from "@/lib/math";
import { useAccount } from "wagmi";
import type { CoolerLoan } from "@/lib/hooks/cooler/useGetCoolerLoans";
import { useExtendLoan } from "@/lib/hooks/cooler/useExtendLoan";
import { useTokenAllowance } from "@/lib/hooks/useTokenAllowance";
import { useTokenApproval } from "@/lib/hooks/useTokenApproval";
import { useTokenBalance } from "@/lib/hooks/useTokenBalance";
import type { ClearingHouseVersion } from "@/lib/hooks/cooler/useGetClearingHouse";
import { formatAmount, formatDate } from "../utils/format";

interface ExtendLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: CoolerLoan | null;
  coolerAddress: string;
  debtAddress: string;
  clearingHouseAddress: string;
  debtAssetName: string;
  interestRate: string;
  duration: string;
  clearingHouseVersion: ClearingHouseVersion;
}

export function V1ExtendLoanModal({
  isOpen,
  onClose,
  loan,
  coolerAddress,
  debtAddress,
  clearingHouseAddress,
  debtAssetName,
  interestRate,
  duration,
  clearingHouseVersion,
}: ExtendLoanModalProps) {
  const { address } = useAccount();
  const [terms, setTerms] = useState("1");

  const { extend, isPending: isExtendPending } = useExtendLoan();
  const { balance: debtBalance } = useTokenBalance(debtAddress as Address, address);

  const extensionTerms = useMemo(() => {
    const parsed = Number.parseInt(terms, 10);
    if (Number.isNaN(parsed) || parsed < 1) return 1;
    return parsed;
  }, [terms]);

  const interestDueOnExtension = useMemo(() => {
    if (!loan) return 0n;
    const durationSeconds = Number(duration) * 86400;
    const rateDecimal = Number(interestRate) * 0.01;
    const interestPercent = (extensionTerms * durationSeconds * rateDecimal) / (365 * 86400);
    const totalDebt = loan.principal + loan.interestDue;
    const interestDue = formatTokenAmount(totalDebt) * interestPercent;
    try {
      return parseUnits(interestDue.toFixed(18), 18);
    } catch {
      return 0n;
    }
  }, [loan, extensionTerms, interestRate, duration]);

  const currentExpiry = loan ? Number(loan.expiry) : 0;
  const newExpiry = currentExpiry + extensionTerms * Number(duration) * 86400;

  const { allowance, queryKey: allowanceQueryKey } = useTokenAllowance(
    debtAddress as Address,
    address,
    clearingHouseAddress as Address,
  );

  const { approve, isPending: isApprovePending } = useTokenApproval();

  const needsApproval = useMemo(() => {
    if (!allowance || interestDueOnExtension === 0n) return false;
    return allowance < interestDueOnExtension;
  }, [allowance, interestDueOnExtension]);

  const handleApprove = () => {
    approve({
      tokenAddress: debtAddress as Address,
      spender: clearingHouseAddress as Address,
      amount: interestDueOnExtension,
      queryKey: allowanceQueryKey,
    });
  };

  const handleExtend = () => {
    if (!loan) return;
    extend({
      clearingHouseAddress: clearingHouseAddress as Address,
      coolerAddress: coolerAddress as Address,
      loanId: loan.loanId,
      times: extensionTerms,
      version: clearingHouseVersion,
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setTerms("1");
      onClose();
    }
  };

  if (!loan) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Extend Loan</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-secondary-t">Current Term</span>
              <span>{formatDate(currentExpiry)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary-t">New Term</span>
              <span className="font-semibold">{formatDate(newExpiry)}</span>
            </div>
          </div>

          <div>
            <label htmlFor="extend-terms" className="mb-1 block text-xs text-secondary-t">
              Number of Terms
            </label>
            <Input
              id="extend-terms"
              type="number"
              min="1"
              step="1"
              placeholder="1"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-secondary-t">Interest Rate</span>
              <span>{Number(interestRate).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary-t">Wallet Balance</span>
              <span>
                {debtBalance !== undefined ? `${formatAmount(debtBalance)} ${debtAssetName}` : "--"}
              </span>
            </div>
            <div className="border-a5-b flex justify-between border-t pt-2 font-semibold">
              <span className="text-secondary-t">Interest Due on Extension</span>
              <span>
                {formatAmount(interestDueOnExtension)} {debtAssetName}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {needsApproval ? (
              <Button
                onClick={handleApprove}
                disabled={isApprovePending || interestDueOnExtension === 0n}
              >
                {isApprovePending ? "Approving..." : `Approve ${debtAssetName}`}
              </Button>
            ) : (
              <Button
                onClick={handleExtend}
                disabled={isExtendPending || interestDueOnExtension === 0n}
              >
                {isExtendPending ? "Extending..." : "Extend"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
