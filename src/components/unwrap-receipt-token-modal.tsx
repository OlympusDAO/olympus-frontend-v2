import type React from "react";
import { useState, useEffect } from "react";
import { trackUnwrapReceiptToken } from "@/lib/analytics";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, ExternalLink } from "lucide-react";
import { Icon } from "@/components/icon";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { blockExplorerTxBaseUrl } from "@/lib/helpers";
import { useUnwrapReceiptToken } from "@/lib/hooks/cds/useUnwrapReceiptToken";
import { useTokenAllowance } from "@/lib/hooks/useTokenAllowance";
import { useTokenApproval } from "@/lib/hooks/useTokenApproval";
import { useReceiptTokenManager } from "@/lib/hooks/cds/useReceiptTokenManager";

interface TokenBalance {
  asset: string;
  periodMonths: number;
  totalBalance: bigint;
  wrappedBalance?: bigint;
  displayName: string;
  tokenId: bigint;
  wrappedTokenAddress: string;
  isWrapped: boolean;
}

interface UnwrapReceiptTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  wrappedBalance?: TokenBalance;
}

export const UnwrapReceiptTokenModal: React.FC<UnwrapReceiptTokenModalProps> = ({
  isOpen,
  onClose,
  wrappedBalance,
}) => {
  const [unwrapAmount, setUnwrapAmount] = useState("");
  const [showSteps, setShowSteps] = useState(false);
  const { address: userAddress } = useAccount();
  const { receiptTokenManagerAddress } = useReceiptTokenManager();

  // Unwrap transaction hook
  const {
    unwrap,
    isPending: isUnwrapping,
    isSuccess: isUnwrapSuccess,
    hash: unwrapHash,
  } = useUnwrapReceiptToken();

  // Approval hooks for wrapped ERC-20 token
  const { allowance, queryKey: allowanceQueryKey } = useTokenAllowance(
    wrappedBalance?.wrappedTokenAddress as `0x${string}`,
    userAddress,
    receiptTokenManagerAddress,
  );

  const {
    approve,
    isPending: isApproving,
    isSuccess: approvalSuccess,
    hash: approvalHash,
  } = useTokenApproval();

  // Helper functions
  const formatAmount = (amount: bigint) => {
    return parseFloat(formatEther(amount)).toFixed(2);
  };

  // Format amount for display in detail text (shorter format)
  const formatDisplayAmount = (amountStr: string) => {
    if (!amountStr) return "0";
    const num = parseFloat(amountStr);
    if (num === 0) return "0";
    // For very small or very large numbers, use compact notation
    if (num < 0.01 || num > 999999) {
      return num.toLocaleString(undefined, {
        notation: "compact",
        maximumFractionDigits: 2,
      });
    }
    // Otherwise use standard notation with 2 decimals
    return num.toLocaleString(undefined, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    });
  };

  // Token balance data
  const availableAmount = wrappedBalance?.wrappedBalance
    ? formatAmount(wrappedBalance.wrappedBalance)
    : "0";

  const displayTokenName = wrappedBalance?.displayName || "Receipt Token";

  // Parse unwrap amount as bigint
  const unwrapAmountBigInt = unwrapAmount ? parseEther(unwrapAmount) : 0n;

  // Check if user has sufficient balance
  const hasInsufficientBalance =
    wrappedBalance?.wrappedBalance &&
    unwrapAmountBigInt > 0n &&
    wrappedBalance.wrappedBalance < unwrapAmountBigInt;

  // Check if approval is needed
  const needsApproval =
    allowance !== undefined && unwrapAmountBigInt > 0n && allowance < unwrapAmountBigInt;

  // Check if we have sufficient allowance
  const hasSufficientAllowance = !needsApproval;

  // Determine current step based on allowance and unwrap success
  const getCurrentStep = () => {
    if (isUnwrapSuccess) return 2;
    if (hasSufficientAllowance) return 2;
    return 1;
  };

  const currentStep = getCurrentStep();

  // Helper function to format transaction hash for display
  const formatTxHash = (hash?: `0x${string}`) => {
    if (!hash) return "";
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  const handleMaxClick = () => {
    setUnwrapAmount(formatEther(wrappedBalance?.wrappedBalance || 0n));
  };

  const handleStartUnwrap = () => {
    if (unwrapAmountBigInt > 0n && !hasInsufficientBalance) {
      setShowSteps(true);
    }
  };

  const handleApprove = async () => {
    if (!wrappedBalance || !receiptTokenManagerAddress || unwrapAmountBigInt === 0n) return;

    try {
      await approve({
        tokenAddress: wrappedBalance.wrappedTokenAddress as `0x${string}`,
        spender: receiptTokenManagerAddress,
        amount: unwrapAmountBigInt,
        queryKey: allowanceQueryKey,
      });
    } catch (error) {
      console.error("Failed to approve wrapped tokens:", error);
    }
  };

  const handleUnwrap = async () => {
    if (!wrappedBalance || unwrapAmountBigInt === 0n) return;

    try {
      await unwrap({
        tokenId: wrappedBalance.tokenId,
        amount: unwrapAmountBigInt,
        queryKey: ["tokenBalances"],
      });
    } catch (error) {
      console.error("Failed to unwrap tokens:", error);
    }
  };

  const steps = [
    {
      number: 1,
      title: "Approve Wrapped Tokens",
      isActive: currentStep === 1,
      isCompleted: currentStep > 1,
      isLoading: currentStep === 1 && isApproving,
      hash: approvalSuccess ? approvalHash : undefined,
    },
    {
      number: 2,
      title: "Unwrap to ERC-6909",
      detail: `${formatDisplayAmount(unwrapAmount)} ${displayTokenName} (Wrapped) → Unwrapped`,
      isActive: currentStep === 2,
      isCompleted: isUnwrapSuccess,
      isLoading: currentStep === 2 && isUnwrapping,
      hash: isUnwrapSuccess ? unwrapHash : undefined,
    },
  ];

  useEffect(() => {
    if (!isUnwrapSuccess) return;
    trackUnwrapReceiptToken({ amount: unwrapAmount, txHash: unwrapHash });
  }, [isUnwrapSuccess]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setUnwrapAmount("");
      setShowSteps(false);
    }
  }, [isOpen]);

  // Steps view
  if (showSteps) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full sm:max-w-md mx-auto p-0 gap-0 !rounded-3xl">
          <DialogHeader className="px-6 pt-6 pb-2 text-center !gap-6">
            {isUnwrapSuccess ? (
              <div className="w-full mx-auto items-center justify-center">
                <div className="flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green" />
                </div>
                <p className="text-xl font-semibold mb-2 text-center">
                  Tokens unwrapped successfully!
                </p>
                <p className="text-sm text-secondary-t text-center">
                  Your wrapped ERC-20 tokens have been converted to ERC-6909 tokens.
                </p>
              </div>
            ) : (
              <>
                <DialogTitle className="text-[20px]/[24px] font-semibold text-primary-t">
                  Unwrap Receipt Tokens
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
                    {/* Left side - Step number and title */}
                    <div className="flex items-center gap-3 flex-1">
                      {step.isCompleted ? (
                        <div className="w-5 h-5 rounded-full border border-green flex items-center justify-center flex-shrink-0 text-green">
                          <CheckCircle2 className="h-3 w-3" />
                        </div>
                      ) : step.isLoading ? (
                        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                          <Loader2 className="h-3 w-3 animate-spin text-primary-t" />
                        </div>
                      ) : (
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 text-xs font-medium ${
                            step.isActive
                              ? "border-primary-t text-primary-t"
                              : "border-a10-b text-secondary-t"
                          }`}
                        >
                          <span>{step.number}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm/5 font-semibold text-primary-t">{step.title}</p>
                        {step.detail && (
                          <p className="text-xs text-secondary-t mt-0.5 truncate">{step.detail}</p>
                        )}
                        {step.hash && (
                          <a
                            href={`${blockExplorerTxBaseUrl}${step.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue hover:underline flex items-center gap-1 mt-1"
                          >
                            {formatTxHash(step.hash)}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  {index < steps.length - 1 && <div className="border-b border-a3-b mx-4" />}
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="mt-6 space-y-3">
              {!isUnwrapSuccess && (
                <>
                  {currentStep === 1 && (
                    <Button
                      onClick={handleApprove}
                      disabled={isApproving || unwrapAmountBigInt === 0n}
                      className="w-full"
                    >
                      {isApproving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Approving...
                        </>
                      ) : (
                        "Approve Wrapped Tokens"
                      )}
                    </Button>
                  )}
                  {currentStep === 2 && !isUnwrapSuccess && (
                    <Button
                      onClick={handleUnwrap}
                      disabled={isUnwrapping || unwrapAmountBigInt === 0n}
                      className="w-full"
                    >
                      {isUnwrapping ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Unwrapping...
                        </>
                      ) : (
                        "Unwrap Tokens"
                      )}
                    </Button>
                  )}
                </>
              )}
              {isUnwrapSuccess && (
                <Button onClick={onClose} className="w-full">
                  Close
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Input view
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full sm:max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle>Unwrap Receipt Tokens</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Info box */}
          <div className="bg-blue/10 border border-blue/20 rounded-lg p-4">
            <p className="text-sm text-primary-t">
              Unwrapping converts your wrapped ERC-20 tokens back to ERC-6909 receipt tokens. You
              need unwrapped tokens to redeem for underlying assets.
            </p>
          </div>

          {/* Amount input section */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-secondary-t">Wrapped Balance</span>
              <span className="text-primary-t font-medium">
                {availableAmount} {displayTokenName}
              </span>
            </div>

            <div className="relative">
              <Input
                type="number"
                placeholder="0.00"
                value={unwrapAmount}
                onChange={(e) => setUnwrapAmount(e.target.value)}
                className="pr-20 text-lg"
              />
              <Button
                variant="tertiary"
                size="sm"
                onClick={handleMaxClick}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-2 text-xs"
              >
                Max
              </Button>
            </div>

            {hasInsufficientBalance && (
              <p className="text-xs text-red-500">Insufficient wrapped balance</p>
            )}
          </div>

          {/* You Receive section */}
          <div className="bg-surface-a3 border border-a3-b rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-secondary-t">You Receive</span>
              <div className="flex items-center gap-2">
                <Icon name="cdUSDSIcon" size={20} />
                <span className="text-sm font-medium">
                  {unwrapAmount || "0.00"} {displayTokenName}
                </span>
              </div>
            </div>
            <p className="text-xs text-secondary-t">
              Unwrapped ERC-6909 receipt tokens ready for redemption
            </p>
          </div>

          {/* Action button */}
          <Button
            onClick={handleStartUnwrap}
            disabled={!unwrapAmount || parseFloat(unwrapAmount) === 0 || !!hasInsufficientBalance}
            className="w-full"
          >
            Unwrap Tokens
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
