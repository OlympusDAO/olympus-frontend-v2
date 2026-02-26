import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckIcon, ExternalLink, CheckCircle2 } from "lucide-react";
import cdUSDSIcon from "@/assets/cdUSDS.png";
import USDSIcon from "@/assets/USDS.png";
import { formatEther } from "viem";
import { useAccount, useChainId } from "wagmi";
import { Link } from "react-router-dom";
import { blockExplorerTxBaseUrl } from "@/lib/helpers";
import { ContractName, requireContractAddress } from "@/lib/contracts";
import { useTokenBalance } from "@/lib/hooks/useTokenBalance";
import { getTokenAddress } from "@/lib/tokens";
import { useTokenAllowance } from "@/lib/hooks/useTokenAllowance";
import { useTokenApproval } from "@/lib/hooks/useTokenApproval";
import { useExtendLoan } from "@/lib/hooks/cds/useExtendLoan";
import { usePreviewExtendLoan } from "@/lib/hooks/cds/usePreviewExtendLoan";

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

export const ExtendLoanModal: React.FC<ExtendLoanModalProps> = ({
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
      const parsed = parseInt(customMonths);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 255) {
        return parsed;
      }
    }
    return selectedMonths;
  }, [isCustomMode, customMonths, selectedMonths]);

  // Preview extension cost using effective months
  const { newDueDate, interestPayable, isLoading: isLoadingPreview } = usePreviewExtendLoan(
    userAddress,
    redemptionId ?? undefined,
    effectiveMonths
  );

  // Get USDS token address and balance
  const usdsTokenAddress = getTokenAddress("USDS", chainId);
  const { balance: usdsBalance } = useTokenBalance(usdsTokenAddress, userAddress);

  // Get the target contract address for approval (DepositRedemptionVault)
  const targetContractAddress = chainId
    ? requireContractAddress(ContractName.DEPOSIT_REDEMPTION_VAULT, chainId)
    : undefined;

  // Token approval hooks
  const { allowance, refetch: refetchAllowance, queryKey } = useTokenAllowance(
    usdsTokenAddress!,
    userAddress,
    targetContractAddress
  );

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <DialogContent className="w-full sm:max-w-md mx-auto p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 text-center">
            {isExtendSuccess ? (
              <div className="w-full mx-auto items-center justify-center">
                <div className="flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green" />
                </div>
                <p className="text-xl font-semibold mb-2 text-center">
                  Congrats, all done!
                </p>
                <p className="text-sm text-secondary-t text-center">
                  Your loan has been extended successfully.
                </p>
              </div>
            ) : (
              <>
                <DialogTitle className="text-xl">Extend Loan</DialogTitle>
                <p className="text-sm text-secondary-t font-light">
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
                        className={`w-6 h-6 rounded-full ring-3 flex items-center justify-center text-sm font-medium ${
                          step.isCompleted
                            ? "text-green"
                            : step.isActive
                            ? "text-primary-t"
                            : "text-secondary-t ring-a10-b"
                        }`}
                      >
                        {step.isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : step.isCompleted ? (
                          <CheckIcon className="h-4 w-4" />
                        ) : (
                          step.number
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{step.title}</div>
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
                  {index < steps.length - 1 && (
                    <div className="border-b border-a5-b mx-4" />
                  )}
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
            <label className="text-sm font-medium mb-3 block">
              Extension Period
            </label>
            <div className="grid grid-cols-5 gap-2">
              {EXTENSION_PERIODS.map((months) => (
                <Button
                  key={months}
                  variant={!isCustomMode && selectedMonths === months ? "default" : "outline"}
                  onClick={() => {
                    setIsCustomMode(false);
                    setSelectedMonths(months);
                  }}
                  className="h-12"
                >
                  {months}m
                </Button>
              ))}
              <Button
                variant={isCustomMode ? "default" : "outline"}
                onClick={() => setIsCustomMode(true)}
                className="h-12"
              >
                Custom
              </Button>
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
                    const numValue = parseInt(value);
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
          <div className="bg-surface-a3 rounded-3xl p-4 border border-a3-b">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Interest Cost</label>
            </div>
            <div className="relative">
              <div className="text-3xl h-12 flex items-center font-medium">
                {isLoadingPreview ? "..." : parseFloat(interestCost).toFixed(2)}
              </div>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-full bg-surface-a5 p-2 border border-a5-b">
                  <img src={USDSIcon} alt="USDS" className="w-5 h-5" />
                  <span className="font-medium text-sm">USDS</span>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center mt-2 text-sm">
              <div className="flex items-center gap-1 text-secondary-t">
                <span>USDS Balance:</span>
                <span>
                  {usdsBalance
                    ? parseFloat(formatEther(usdsBalance)).toFixed(2)
                    : "0"}
                </span>
              </div>
            </div>
          </div>

          {/* Position Info */}
          <div className="bg-surface-a3 rounded-xl p-4 border border-a3-b space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-secondary-t">Collateral</span>
              <div className="flex items-center gap-1">
                <img src={cdUSDSIcon} alt="cdUSDS" className="w-4 h-4" />
                <span className="font-medium">
                  {collateralAmount} {collateralToken}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-secondary-t">Current Debt</span>
              <div className="flex items-center gap-1">
                <img src={USDSIcon} alt="USDS" className="w-4 h-4" />
                <span className="font-medium">
                  {(parseFloat(principal) + parseFloat(interest)).toFixed(2)} USDS
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-secondary-t">New Due Date</span>
              <span className="font-medium">
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
