import type React from "react";
import { useState, useEffect } from "react";
import { trackWrapReceiptToken } from "@/lib/analytics";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, ExternalLink } from "lucide-react";
import cdUSDSIcon from "@/assets/cdUSDS.png";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { blockExplorerTxBaseUrl } from "@/lib/helpers";
import { useWrapReceiptToken } from "@/lib/hooks/cds/useWrapReceiptToken";
import {
  useFlexibleReceiptTokenAllowance,
  useFlexibleApproveReceiptToken,
} from "@/lib/hooks/cds/useFlexibleReceiptTokenApproval";
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

interface WrapReceiptTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  unwrappedBalance?: TokenBalance;
}

export const WrapReceiptTokenModal: React.FC<WrapReceiptTokenModalProps> = ({
  isOpen,
  onClose,
  unwrappedBalance,
}) => {
  const [wrapAmount, setWrapAmount] = useState("");
  const [showSteps, setShowSteps] = useState(false);
  const { address: userAddress } = useAccount();
  const { receiptTokenManagerAddress } = useReceiptTokenManager();

  // Wrap transaction hook
  const {
    wrap,
    isPending: isWrapping,
    isSuccess: isWrapSuccess,
    hash: wrapHash,
  } = useWrapReceiptToken();

  // Approval hooks for ERC-6909 token
  const { allowance } = useFlexibleReceiptTokenAllowance(
    unwrappedBalance?.tokenId,
    userAddress,
    receiptTokenManagerAddress,
  );

  const {
    approveReceiptToken,
    isPending: isApproving,
    isSuccess: approvalSuccess,
    hash: approvalHash,
  } = useFlexibleApproveReceiptToken(receiptTokenManagerAddress);

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
  const availableAmount = unwrappedBalance?.totalBalance
    ? formatAmount(unwrappedBalance.totalBalance)
    : "0";

  const displayTokenName = unwrappedBalance?.displayName || "Receipt Token";

  // Parse wrap amount as bigint
  const wrapAmountBigInt = wrapAmount ? parseEther(wrapAmount) : 0n;

  // Check if user has sufficient balance
  const hasInsufficientBalance =
    unwrappedBalance?.totalBalance &&
    wrapAmountBigInt > 0n &&
    unwrappedBalance.totalBalance < wrapAmountBigInt;

  // Check if approval is needed
  const needsApproval =
    allowance !== undefined && wrapAmountBigInt > 0n && allowance < wrapAmountBigInt;

  // Check if we have sufficient allowance
  const hasSufficientAllowance = !needsApproval;

  // Determine current step based on allowance and wrap success
  const getCurrentStep = () => {
    if (isWrapSuccess) return 2;
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
    setWrapAmount(formatEther(unwrappedBalance?.totalBalance || 0n));
  };

  const handleStartWrap = () => {
    if (wrapAmountBigInt > 0n && !hasInsufficientBalance) {
      setShowSteps(true);
    }
  };

  const handleApprove = async () => {
    if (!unwrappedBalance || !receiptTokenManagerAddress || wrapAmountBigInt === 0n) return;

    try {
      await approveReceiptToken({
        tokenId: unwrappedBalance.tokenId,
        amount: wrapAmountBigInt,
      });
    } catch (error) {
      console.error("Failed to approve receipt tokens:", error);
    }
  };

  const handleWrap = async () => {
    if (!unwrappedBalance || wrapAmountBigInt === 0n) return;

    try {
      await wrap({
        tokenId: unwrappedBalance.tokenId,
        amount: wrapAmountBigInt,
        queryKey: ["tokenBalances"],
      });
    } catch (error) {
      console.error("Failed to wrap tokens:", error);
    }
  };

  const steps = [
    {
      number: 1,
      title: "Approve Receipt Tokens",
      isActive: currentStep === 1,
      isCompleted: currentStep > 1,
      isLoading: currentStep === 1 && isApproving,
      hash: approvalSuccess ? approvalHash : undefined,
    },
    {
      number: 2,
      title: "Wrap to ERC-20",
      detail: `${formatDisplayAmount(wrapAmount)} ${displayTokenName} → Wrapped`,
      isActive: currentStep === 2,
      isCompleted: isWrapSuccess,
      isLoading: currentStep === 2 && isWrapping,
      hash: isWrapSuccess ? wrapHash : undefined,
    },
  ];

  useEffect(() => {
    if (!isWrapSuccess) return;
    trackWrapReceiptToken({ amount: wrapAmount, txHash: wrapHash });
  }, [isWrapSuccess]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setWrapAmount("");
      setShowSteps(false);
    }
  }, [isOpen]);

  // Steps view
  if (showSteps) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full sm:max-w-md mx-auto p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 text-center">
            {isWrapSuccess ? (
              <div className="w-full mx-auto items-center justify-center">
                <div className="flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green" />
                </div>
                <p className="text-xl font-semibold mb-2 text-center">
                  Tokens wrapped successfully!
                </p>
                <p className="text-sm text-secondary-t text-center">
                  Your ERC-6909 tokens have been converted to wrapped ERC-20 tokens.
                </p>
              </div>
            ) : (
              <>
                <DialogTitle className="text-xl">Wrap Receipt Tokens</DialogTitle>
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
                    {/* Left side - Step number and title */}
                    <div className="flex items-center gap-3 flex-1">
                      {step.isCompleted ? (
                        <div className="w-6 h-6 rounded-full bg-green flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="h-4 w-4 text-white" />
                        </div>
                      ) : step.isLoading ? (
                        <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        </div>
                      ) : (
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                            step.isActive
                              ? "bg-primary text-white"
                              : "bg-surface-a10 text-secondary-t"
                          }`}
                        >
                          <span className="text-sm font-medium">{step.number}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            step.isActive
                              ? "text-primary-t"
                              : step.isCompleted
                                ? "text-primary-t"
                                : "text-secondary-t"
                          }`}
                        >
                          {step.title}
                        </p>
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
              {!isWrapSuccess && (
                <>
                  {currentStep === 1 && (
                    <Button
                      onClick={handleApprove}
                      disabled={isApproving || wrapAmountBigInt === 0n}
                      className="w-full"
                    >
                      {isApproving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Approving...
                        </>
                      ) : (
                        "Approve Receipt Tokens"
                      )}
                    </Button>
                  )}
                  {currentStep === 2 && !isWrapSuccess && (
                    <Button
                      onClick={handleWrap}
                      disabled={isWrapping || wrapAmountBigInt === 0n}
                      className="w-full"
                    >
                      {isWrapping ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Wrapping...
                        </>
                      ) : (
                        "Wrap Tokens"
                      )}
                    </Button>
                  )}
                </>
              )}
              {isWrapSuccess && (
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
          <DialogTitle>Wrap Receipt Tokens</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Info box */}
          <div className="bg-blue/10 border border-blue/20 rounded-lg p-4">
            <p className="text-sm text-primary-t">
              Wrapping converts your ERC-6909 receipt tokens to standard ERC-20 tokens.
            </p>
          </div>

          {/* Amount input section */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-secondary-t">Available Balance</span>
              <span className="text-primary-t font-medium">
                {availableAmount} {displayTokenName}
              </span>
            </div>

            <div className="relative">
              <Input
                type="number"
                placeholder="0.00"
                value={wrapAmount}
                onChange={(e) => setWrapAmount(e.target.value)}
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

            {hasInsufficientBalance && <p className="text-xs text-red-500">Insufficient balance</p>}
          </div>

          {/* You Receive section */}
          <div className="bg-surface-a3 border border-a3-b rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-secondary-t">You Receive</span>
              <div className="flex items-center gap-2">
                <img src={cdUSDSIcon} alt="Receipt Token" className="w-5 h-5" />
                <span className="text-sm font-medium">
                  {wrapAmount || "0.00"} {displayTokenName} (Wrapped)
                </span>
              </div>
            </div>
          </div>

          {/* Action button */}
          <Button
            onClick={handleStartWrap}
            disabled={!wrapAmount || parseFloat(wrapAmount) === 0 || !!hasInsufficientBalance}
            className="w-full"
          >
            Wrap Tokens
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
