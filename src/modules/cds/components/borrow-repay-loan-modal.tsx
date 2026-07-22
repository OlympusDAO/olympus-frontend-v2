import type React from "react";
import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { trackRepayLoan } from "@/lib/analytics.ts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Form, FormField, FormItem } from "@/components/ui/form.tsx";
import { TokenBigInput } from "@/components/ui/token-big-input.tsx";
import { Icon } from "@/components/icon.tsx";
import { Loader2, CheckIcon, ExternalLink, CheckCircle2 } from "lucide-react";
import { formatEther, parseEther } from "viem";
import { useAccount, useChainId } from "wagmi";
import { Link } from "react-router-dom";
import { blockExplorerTxBaseUrl } from "@/lib/helpers.ts";
import { ContractName, getContractAddress } from "@/lib/contracts.ts";
import { useRedemptionLoan } from "@/lib/hooks/cds/useRedemptionLoan.ts";
import { useTokenBalance } from "@/lib/hooks/useTokenBalance.tsx";
import { getTokenAddress, TokenName } from "@/lib/tokens.ts";
import { useTokenAllowance } from "@/lib/hooks/useTokenAllowance.tsx";
import { useTokenApproval } from "@/lib/hooks/useTokenApproval.tsx";
import { useRepayLoan } from "@/lib/hooks/cds/useRepayLoan.tsx";
import { useFullRepayAmount } from "@/lib/hooks/cds/useFullRepayAmount.ts";
import type { TokenWithBalance } from "@/lib/hooks/useToken.tsx";

interface RepayLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  redemptionId: number | null;
  collateralAmount: string;
  collateralToken: string;
}

const formatTxHash = (hash: string) => `${hash.slice(0, 6)}...${hash.slice(-4)}`;

export const BorrowRepayLoanModal: React.FC<RepayLoanModalProps> = ({
  isOpen,
  onClose,
  redemptionId,
  collateralAmount,
  collateralToken,
}) => {
  const [showSteps, setShowSteps] = useState(false);
  const { address: userAddress } = useAccount();
  const chainId = useChainId();

  const form = useForm({ defaultValues: { repayAmount: "" } });
  const repayAmount = form.watch("repayAmount");

  const { loanData, refetch: refetchLoan } = useRedemptionLoan(
    userAddress,
    redemptionId ?? undefined,
  );

  const usdsTokenAddress = getTokenAddress(TokenName.USDS, chainId);
  const { balance: usdsBalance } = useTokenBalance(usdsTokenAddress, userAddress);

  const targetContractAddress = getContractAddress(ContractName.DEPOSIT_REDEMPTION_VAULT, chainId);

  const {
    allowance,
    refetch: refetchAllowance,
    queryKey,
  } = useTokenAllowance(usdsTokenAddress!, userAddress, targetContractAddress);

  const {
    approve,
    isPending: isApproving,
    isSuccess: approvalSuccess,
    hash: approvalHash,
    reset: resetApproval,
  } = useTokenApproval();

  const {
    repayLoan,
    isPending: isRepaying,
    isSuccess: isRepaySuccess,
    hash: repayHash,
    reset: resetRepay,
  } = useRepayLoan();

  // Exact outstanding debt in wei. Avoid float math here: the amount we send must be
  // precise so the loan fully zeroes out (see useFullRepayAmount for the rounding details).
  const exactDebt = useMemo(
    () => (loanData ? loanData.principal + loanData.interest : 0n),
    [loanData],
  );

  // Exact amount that fully clears the loan in one tx, with the ERC4626 rounding buffer.
  const { fullRepayAmount } = useFullRepayAmount(loanData?.principal, loanData?.interest);

  const totalDebt = useMemo(() => {
    if (!loanData) return "0";
    const principal = parseFloat(formatEther(loanData.principal));
    const interest = parseFloat(formatEther(loanData.interest));
    return (principal + interest).toFixed(2);
  }, [loanData]);

  // Whether the entered amount means "repay the whole loan" (>= exact outstanding debt, e.g.
  // via "Max"). Such repayments must use the buffered `fullRepayAmount` to avoid leaving dust.
  const isFullRepayIntent = useMemo(() => {
    if (!repayAmount || repayAmount === "0" || exactDebt === 0n) return false;
    try {
      return parseEther(repayAmount) >= exactDebt;
    } catch {
      return false;
    }
  }, [repayAmount, exactDebt]);

  // Resolve the actual amount to send for the current input. For a full repayment, send the
  // buffered `fullRepayAmount` so the loan zeroes out in a single transaction. While that buffer
  // is still loading (ERC4626 reads in flight) this stays `undefined`, which disables submission
  // so we never fall through to an unbuffered, dust-leaving repay. Partial repayments send
  // exactly what was entered.
  const repayAmountWei = useMemo(() => {
    if (!repayAmount || repayAmount === "0") return undefined;
    try {
      if (isFullRepayIntent) return fullRepayAmount;
      return parseEther(repayAmount);
    } catch {
      return undefined;
    }
  }, [repayAmount, isFullRepayIntent, fullRepayAmount]);

  // For the "Max" button: repay the full debt (exact, full precision) when the balance covers
  // it, otherwise repay the entire balance. formatEther produces a minimal decimal string.
  const maxRepayableAmount = useMemo(() => {
    const balance = usdsBalance ?? 0n;
    if (exactDebt > 0n && balance >= exactDebt) return formatEther(exactDebt);
    return formatEther(balance);
  }, [exactDebt, usdsBalance]);

  const needsApproval = useMemo(() => {
    if (!repayAmountWei || !loanData) return false;
    // Allowance read still in flight: default to requiring approval so we never fall through
    // to a repay that would revert on transferFrom. Matches borrow-form/repay-form/borrow-extend.
    if (allowance === undefined) return true;
    const maxSlippage = (loanData.principal * 10n) / 10000n;
    return allowance < repayAmountWei + maxSlippage;
  }, [repayAmountWei, allowance, loanData]);

  const currentStep = useMemo(() => {
    if (isRepaySuccess) return 3;
    if (!needsApproval || approvalSuccess) return 2;
    return 1;
  }, [approvalSuccess, needsApproval, isRepaySuccess]);

  const isValidAmount = useMemo(() => {
    // Validate against the user-entered amount (in wei) so we never block a valid full
    // repayment: the buffered `fullRepayAmount` may be a few wei above the entered value.
    if (!repayAmount || repayAmount === "0") return false;
    try {
      const entered = parseEther(repayAmount);
      const balance = usdsBalance ?? 0n;
      if (entered <= 0n || entered > exactDebt || entered > balance) return false;
      // Keep a full repayment disabled until its buffered amount is ready, so the click can't
      // fall through to an unbuffered (dust-leaving) repay.
      if (isFullRepayIntent && fullRepayAmount === undefined) return false;
      return true;
    } catch {
      return false;
    }
  }, [repayAmount, exactDebt, usdsBalance, isFullRepayIntent, fullRepayAmount]);

  const handleApprove = async () => {
    if (!repayAmountWei || !usdsTokenAddress || !targetContractAddress || !loanData) return;
    try {
      const maxSlippage = (loanData.principal * 10n) / 10000n;
      approve({
        tokenAddress: usdsTokenAddress,
        spender: targetContractAddress,
        amount: repayAmountWei + maxSlippage,
        queryKey,
      });
      await refetchAllowance();
    } catch (error) {
      console.error("Approval failed:", error);
    }
  };

  const handleRepay = async () => {
    if (!repayAmountWei || redemptionId === null || !loanData) return;
    try {
      const maxSlippage = (loanData.principal * 10n) / 10000n;
      repayLoan({ redemptionId, amount: repayAmountWei, maxSlippage });
    } catch (error) {
      console.error("Repayment failed:", error);
    }
  };

  const handleStartRepay = () => {
    if (!isValidAmount) return;
    setShowSteps(true);
    if (!needsApproval) handleRepay();
  };

  useEffect(() => {
    if (!isRepaySuccess) return;
    trackRepayLoan({ amount: repayAmount, txHash: repayHash });
  }, [isRepaySuccess]);

  useEffect(() => {
    if (isOpen) {
      form.reset();
      setShowSteps(false);
      resetApproval();
      resetRepay();
      if (redemptionId !== null) refetchLoan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, redemptionId]);

  const usdsToken: TokenWithBalance = {
    addresses: {},
    address: usdsTokenAddress,
    symbol: "USDS",
    decimals: 18,
    icon: "USDSColorTokenIcon",
    balance: usdsBalance ?? 0n,
    formattedBalance: usdsBalance ? formatEther(usdsBalance) : "0",
    price: 1,
  };

  const steps = [
    {
      number: 1,
      title: "Approve USDS",
      detail: `$${parseFloat(repayAmount || "0").toFixed(2)}`,
      isActive: currentStep === 1,
      isCompleted: currentStep > 1,
      isLoading: currentStep === 1 && isApproving,
      hash: approvalSuccess ? approvalHash : undefined,
    },
    {
      number: 2,
      title: "Repay Loan",
      detail: `-${parseFloat(repayAmount || "0").toFixed(2)} USDS`,
      isActive: currentStep === 2,
      isCompleted: isRepaySuccess,
      isLoading: currentStep === 2 && isRepaying,
      hash: isRepaySuccess ? repayHash : undefined,
    },
  ];

  // Steps view
  if (showSteps) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full sm:max-w-md mx-auto p-0 gap-0 !rounded-3xl">
          <DialogHeader className="px-6 pt-6 pb-2 text-center !gap-6">
            {isRepaySuccess ? (
              <div className="w-full mx-auto items-center justify-center">
                <div className="flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green" />
                </div>
                <p className="text-xl font-semibold mb-2 text-center">Congrats, all done!</p>
                <p className="text-sm text-secondary-t text-center">
                  Your loan has been repaid successfully.
                </p>
              </div>
            ) : (
              <>
                <DialogTitle className="text-[20px]/[24px] font-semibold text-primary-t">
                  Repay Loan
                </DialogTitle>
                <p className="text-xs/4 font-normal text-secondary-t">
                  Step {currentStep}/2. Proceed with your wallet.
                </p>
              </>
            )}
          </DialogHeader>

          <div className="px-6 pb-6">
            <div className="bg-surface-a3 border border-a3-b rounded-3xl">
              {steps.map((step, index) => (
                <div key={step.number}>
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs font-medium ${
                          step.isCompleted
                            ? "text-green border-green"
                            : step.isActive
                              ? "text-primary-t border-primary-t"
                              : "text-secondary-t border-a10-b"
                        }`}
                      >
                        {step.isLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : step.isCompleted ? (
                          <CheckIcon className="h-3 w-3" />
                        ) : (
                          step.number
                        )}
                      </div>
                      <div>
                        <div className="text-sm/5 font-semibold text-primary-t">{step.title}</div>
                        {step.detail && (
                          <div className="text-xs text-secondary-t rounded-full border px-2 py-1 text-center border-a10-b inline-block mt-1">
                            {step.detail}
                          </div>
                        )}
                        {step.isCompleted && step.hash && (
                          <Link
                            target="_blank"
                            to={`${blockExplorerTxBaseUrl}/${step.hash}`}
                            className="flex items-center gap-1 text-xs text-blue hover:text-blue-800 mt-1"
                          >
                            {formatTxHash(step.hash)}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                  {index < steps.length - 1 && <div className="border-b border-a5-b mx-4" />}
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              {isRepaySuccess ? (
                <Button onClick={onClose} className="w-full" size="lg">
                  Close
                </Button>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowSteps(false);
                      resetApproval();
                      resetRepay();
                    }}
                    disabled={isApproving || isRepaying}
                    size="lg"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={currentStep === 1 ? handleApprove : handleRepay}
                    disabled={isApproving || isRepaying}
                    className="flex-1"
                    size="lg"
                  >
                    {isApproving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Approving...
                      </>
                    ) : isRepaying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Repaying...
                      </>
                    ) : currentStep === 1 ? (
                      "Approve USDS"
                    ) : (
                      "Repay Loan"
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Main input view
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full sm:max-w-md mx-auto p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl">Repay Loan</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          <Form {...form}>
            <FormField
              control={form.control}
              name="repayAmount"
              render={({ field }) => (
                <FormItem>
                  <TokenBigInput
                    label="Repay"
                    token={usdsToken}
                    value={field.value}
                    onChange={(val) => form.setValue("repayAmount", val)}
                    onMax={() => form.setValue("repayAmount", maxRepayableAmount)}
                    balanceLabel="USDS Balance:"
                  />
                </FormItem>
              )}
            />
          </Form>

          {/* Position Info */}
          <div className="flex flex-col rounded-2xl border border-a3-b bg-surface-a3 p-4">
            <div className="flex items-center justify-between border-b border-a3-b py-2">
              <span className="text-xs text-secondary-t">Collateral</span>
              <div className="flex items-center gap-1">
                <Icon name="cdUSDSIcon" className="size-4" />
                <span className="text-xs font-semibold">
                  {collateralAmount} {collateralToken}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between border-b border-a3-b py-2">
              <span className="text-xs text-secondary-t">Debt</span>
              <div className="flex items-center gap-1">
                <Icon name="USDSColorTokenIcon" className="size-4" />
                <span className="text-xs font-semibold">{totalDebt} USDS</span>
              </div>
            </div>
            {loanData && (
              <>
                <div className="flex items-center justify-between border-b border-a3-b py-2">
                  <span className="text-xs text-secondary-t">Principal</span>
                  <span className="text-xs font-semibold">
                    {parseFloat(formatEther(loanData.principal)).toFixed(2)} USDS
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-secondary-t">Interest</span>
                  <span className="text-xs font-semibold">
                    {parseFloat(formatEther(loanData.interest)).toFixed(2)} USDS
                  </span>
                </div>
              </>
            )}
          </div>

          <Button size="lg" className="w-full" disabled={!isValidAmount} onClick={handleStartRepay}>
            {!repayAmount || repayAmount === "0"
              ? "Enter amount"
              : !isValidAmount
                ? "Invalid amount"
                : `Repay ${parseFloat(repayAmount).toFixed(2)} USDS`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
