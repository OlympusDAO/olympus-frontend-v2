import type React from "react";
import { useState, useEffect, useMemo } from "react";
import { trackExtendLoan } from "@/lib/analytics.ts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { TokenBigInput } from "@/components/ui/token-big-input.tsx";
import { Icon } from "@/components/icon.tsx";
import { Loader2, CheckIcon, ExternalLink, CheckCircle2 } from "lucide-react";
import { formatEther } from "viem";
import type { TokenWithBalance } from "@/lib/hooks/useToken.tsx";
import { useAccount, useChainId } from "wagmi";
import { Link } from "react-router-dom";
import { blockExplorerTxBaseUrl } from "@/lib/helpers.ts";
import { ContractName, requireContractAddress } from "@/lib/contracts.ts";
import { useTokenBalance } from "@/lib/hooks/useTokenBalance.tsx";
import { getTokenAddress, TokenName } from "@/lib/tokens.ts";
import { useTokenAllowance } from "@/lib/hooks/useTokenAllowance.tsx";
import { useTokenApproval } from "@/lib/hooks/useTokenApproval.tsx";
import { useExtendLoan } from "@/lib/hooks/cds/useExtendLoan.tsx";
import { usePreviewExtendLoan } from "@/lib/hooks/cds/usePreviewExtendLoan.tsx";

interface ExtendLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  redemptionId: number | null;
  collateralAmount: string;
  collateralToken: string;
  principal: string;
  interest: string;
}

const formatTxHash = (hash: string) => {
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
};

const EXTENSION_PERIODS = [1, 3, 6, 12]; // months

export const BorrowExtendLoanModal: React.FC<ExtendLoanModalProps> = ({
  isOpen,
  onClose,
  redemptionId,
  collateralAmount,
  collateralToken,
  principal,
  interest,
}) => {
  const [selectedMonths, setSelectedMonths] = useState<number>(3);
  const [customMonths, setCustomMonths] = useState<string>("");
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const { address: userAddress } = useAccount();
  const chainId = useChainId();

  // Use custom months if in custom mode and valid, otherwise use selected preset
  const effectiveMonths = useMemo(() => {
    if (isCustomMode && customMonths) {
      const parsed = parseInt(customMonths, 10);
      if (!Number.isNaN(parsed) && parsed > 0 && parsed <= 255) {
        return parsed;
      }
    }
    return selectedMonths;
  }, [isCustomMode, customMonths, selectedMonths]);

  // Preview extension cost using effective months
  const {
    newDueDate,
    interestPayable,
    isLoading: isLoadingPreview,
  } = usePreviewExtendLoan(userAddress, redemptionId ?? undefined, effectiveMonths);

  // Get USDS token address and balance
  const usdsTokenAddress = getTokenAddress(TokenName.USDS, chainId);
  const { balance: usdsBalance } = useTokenBalance(usdsTokenAddress, userAddress);

  // Get the target contract address for approval (DepositRedemptionVault)
  const targetContractAddress = chainId
    ? requireContractAddress(ContractName.DEPOSIT_REDEMPTION_VAULT, chainId)
    : undefined;

  // Token approval hooks
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

  // Extend loan hook
  const {
    extendLoan,
    isPending: isExtending,
    isSuccess: isExtendSuccess,
    hash: extendHash,
    reset: resetExtend,
  } = useExtendLoan();

  // Calculate interest cost as string
  const interestCost = useMemo(() => {
    if (!interestPayable) return "0";
    return parseFloat(formatEther(interestPayable)).toFixed(2);
  }, [interestPayable]);

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

  // Format new due date
  const formattedNewDueDate = useMemo(() => {
    if (!newDueDate) return "-";
    return new Date(Number(newDueDate) * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [newDueDate]);

  // Check if approval is needed
  const needsApproval = useMemo(() => {
    if (!interestPayable) return false;
    // If allowance is not loaded yet, assume approval is needed (safe default)
    if (allowance === undefined) return true;
    return allowance < interestPayable;
  }, [interestPayable, allowance]);

  // Determine current step
  const currentStep = useMemo(() => {
    if (isExtendSuccess) return 3;
    if (!needsApproval || approvalSuccess) return 2;
    return 1;
  }, [approvalSuccess, needsApproval, isExtendSuccess]);

  // Validation
  const isValidExtension = useMemo(() => {
    if (!interestPayable) return false;
    const cost = parseFloat(interestCost);
    const balance = usdsBalance ? parseFloat(formatEther(usdsBalance)) : 0;
    return cost > 0 && cost <= balance;
  }, [interestCost, usdsBalance, interestPayable]);

  // Refetch allowance after approval is confirmed
  useEffect(() => {
    if (approvalSuccess) {
      refetchAllowance();
    }
  }, [approvalSuccess, refetchAllowance]);

  // Refetch allowance after extension is confirmed (allowance may have been consumed)
  useEffect(() => {
    if (isExtendSuccess) {
      refetchAllowance();
      trackExtendLoan({ newExpiry: `${effectiveMonths} months`, txHash: extendHash });
    }
  }, [isExtendSuccess, refetchAllowance]);

  // Handlers
  const handleApprove = async () => {
    if (!interestPayable || !usdsTokenAddress || !targetContractAddress) return;
    try {
      approve({
        tokenAddress: usdsTokenAddress,
        spender: targetContractAddress,
        amount: interestPayable,
        queryKey,
      });
    } catch (error) {
      console.error("Approval failed:", error);
    }
  };

  const handleExtend = async () => {
    if (redemptionId === null) return;
    try {
      extendLoan({
        redemptionId,
        months: effectiveMonths, // Use effective months
      });
    } catch (error) {
      console.error("Extension failed:", error);
    }
  };

  const handleStartExtend = () => {
    if (!isValidExtension) return;
    setShowSteps(true);
    if (!needsApproval) {
      // If no approval needed, skip to extend
      handleExtend();
    }
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedMonths(3);
      setCustomMonths("");
      setIsCustomMode(false);
      setShowSteps(false);
      resetApproval();
      resetExtend();
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: intentional - reset only when modal opens/closes
  }, [isOpen]);

  // Steps configuration
  const steps = [
    {
      number: 1,
      title: "Approve USDS",
      detail: `$${parseFloat(interestCost).toFixed(2)}`,
      isActive: currentStep === 1,
      isCompleted: currentStep > 1,
      isLoading: currentStep === 1 && isApproving,
      hash: approvalSuccess ? approvalHash : undefined,
    },
    {
      number: 2,
      title: "Extend Loan",
      detail: `+${effectiveMonths} month${effectiveMonths > 1 ? "s" : ""}`,
      isActive: currentStep === 2,
      isCompleted: isExtendSuccess,
      isLoading: currentStep === 2 && isExtending,
      hash: isExtendSuccess ? extendHash : undefined,
    },
  ];

  // Steps view
  if (showSteps) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full sm:max-w-md mx-auto p-0 gap-0 !rounded-3xl">
          <DialogHeader className="px-6 pt-6 pb-2 text-center !gap-6">
            {isExtendSuccess ? (
              <div className="w-full mx-auto items-center justify-center">
                <div className="flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green" />
                </div>
                <p className="text-xl font-semibold mb-2 text-center">Congrats, all done!</p>
                <p className="text-sm text-secondary-t text-center">
                  Your loan has been extended successfully.
                </p>
              </div>
            ) : (
              <>
                <DialogTitle className="text-[20px]/[24px] font-semibold text-primary-t">
                  Extend Loan
                </DialogTitle>
                <p className="text-xs/4 font-normal text-secondary-t">
                  Step {currentStep}/2. Proceed with your wallet.
                </p>
              </>
            )}
          </DialogHeader>

          <div className="px-6 pb-6">
            {/* Steps UI */}
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
              {isExtendSuccess ? (
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
                      resetExtend();
                    }}
                    disabled={isApproving || isExtending}
                    size="lg"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={currentStep === 1 ? handleApprove : handleExtend}
                    disabled={isApproving || isExtending}
                    className="flex-1"
                    size="lg"
                  >
                    {isApproving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Approving...
                      </>
                    ) : isExtending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Extending...
                      </>
                    ) : currentStep === 1 ? (
                      `Approve USDS`
                    ) : (
                      "Extend Loan"
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
          <DialogTitle className="text-xl">Extend Loan</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          {/* Extension Period Selection */}
          <div>
            <span className="text-sm font-medium mb-3 block">Extension Period</span>
            <div className="grid grid-cols-5 gap-2">
              {EXTENSION_PERIODS.map((months) => (
                <button
                  key={months}
                  type="button"
                  className={`cursor-pointer rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                    !isCustomMode && selectedMonths === months
                      ? "border-a10-b bg-surface-a10 text-primary-t"
                      : "border-a3-b bg-surface-a3 text-secondary-t hover:bg-surface-a5"
                  }`}
                  onClick={() => {
                    setIsCustomMode(false);
                    setSelectedMonths(months);
                  }}
                >
                  {months}m
                </button>
              ))}
              <button
                type="button"
                className={`cursor-pointer rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                  isCustomMode
                    ? "border-a10-b bg-surface-a10 text-primary-t"
                    : "border-a3-b bg-surface-a3 text-secondary-t hover:bg-surface-a5"
                }`}
                onClick={() => setIsCustomMode(true)}
              >
                Custom
              </button>
            </div>

            {/* Custom input - only show when custom mode active */}
            {isCustomMode && (
              <div className="mt-3">
                <Input
                  type="number"
                  min="1"
                  max="255"
                  placeholder="Enter months (1-255)"
                  value={customMonths}
                  onChange={(e) => {
                    const value = e.target.value;
                    const numValue = parseInt(value, 10);
                    // Prevent values above 255
                    if (value === "" || (numValue >= 1 && numValue <= 255)) {
                      setCustomMonths(value);
                    }
                  }}
                  autoFocus
                  className="w-full"
                />
              </div>
            )}
          </div>

          {/* Interest Cost Display */}
          <TokenBigInput
            label="Interest Cost"
            token={usdsToken}
            value={isLoadingPreview ? "" : interestCost}
            onChange={() => {}}
            disabled
            balanceLabel="USDS Balance:"
          />

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
              <span className="text-xs text-secondary-t">Current Debt</span>
              <div className="flex items-center gap-1">
                <Icon name="USDSColorTokenIcon" className="size-4" />
                <span className="text-xs font-semibold">
                  {(parseFloat(principal) + parseFloat(interest)).toFixed(2)} USDS
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-secondary-t">New Due Date</span>
              <span className="text-xs font-semibold">
                {isLoadingPreview ? "..." : formattedNewDueDate}
              </span>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full"
            disabled={!isValidExtension || isLoadingPreview}
            onClick={handleStartExtend}
          >
            {isLoadingPreview
              ? "Loading..."
              : !isValidExtension
                ? "Insufficient balance"
                : `Extend for ${parseFloat(interestCost).toFixed(2)} USDS`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
