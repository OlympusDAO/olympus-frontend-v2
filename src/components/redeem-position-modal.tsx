import React, { useState, useEffect } from "react";
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
import { formatEther, parseEther } from "viem";
import { usePositionRedemption } from "@/lib/hooks/cds/usePositionRedemption";
import { useAccount, useChainId } from "wagmi";
import { Link } from "react-router-dom";
import { blockExplorerTxBaseUrl } from "@/lib/helpers";
import {
  useFlexibleReceiptTokenAllowance,
  useFlexibleApproveReceiptToken,
} from "@/lib/hooks/cds/useFlexibleReceiptTokenApproval";
import { formatTermSuffix } from "@/lib/utils";
import { ContractName, requireContractAddress } from "@/lib/contracts";
import { useReceiptTokenId, useReceiptTokenName } from "@/lib/hooks/cds/useReceiptToken";

type Position = {
  id: bigint;
  data:
    | {
        operator: `0x${string}`;
        owner: `0x${string}`;
        asset: `0x${string}`;
        periodMonths: number;
        remainingDeposit: bigint;
        conversionPrice: bigint;
        expiry: number;
        wrapped: boolean;
        additionalData: `0x${string}`;
      }
    | undefined;
};

interface RedeemPositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  position?: Position;
}

export const RedeemPositionModal: React.FC<RedeemPositionModalProps> = ({
  isOpen,
  onClose,
  position,
}) => {
  const [redeemAmount, setRedeemAmount] = useState("");
  const [showSteps, setShowSteps] = useState(false);
  const { address: userAddress } = useAccount();
  const chainId = useChainId();

  // Position redemption hook
  const {
    startPositionRedemption,
    isPending: isRedemptionPending,
    isSuccess: isRedemptionSuccess,
    hash: redemptionHash,
  } = usePositionRedemption();

  // Receipt token ID for approval
  const { tokenId } = useReceiptTokenId(
    position?.data?.asset,
    position?.data?.periodMonths
  );

  // Get the token name dynamically
  const { tokenName } = useReceiptTokenName(tokenId);

  // Get the target contract address for approval (DepositRedemptionVault)
  const targetContractAddress = chainId
    ? requireContractAddress(ContractName.DEPOSIT_REDEMPTION_VAULT, chainId)
    : undefined;

  const { allowance } = useFlexibleReceiptTokenAllowance(
    tokenId,
    userAddress,
    targetContractAddress
  );

  const {
    approveReceiptToken,
    isPending: isApproving,
    isSuccess: approvalSuccess,
    hash: approvalHash,
    reset: resetApproval,
  } = useFlexibleApproveReceiptToken(targetContractAddress);

  // Helper functions
  const formatAmount = (amount: bigint) => {
    return parseFloat(formatEther(amount)).toFixed(2);
  };

  // Position data
  const availableAmount = position?.data
    ? formatAmount(position.data.remainingDeposit)
    : "0";
  const term = position?.data
    ? formatTermSuffix(position.data.periodMonths)
    : "3m";

  // Calculate redemption timeline based on deposit period and expiry
  const redemptionTimelineDays = position?.data
    ? Math.max(
        0,
        Math.ceil(
          (position.data.expiry * 1000 - Date.now()) / (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  // Parse redeem amount as bigint
  const redeemAmountBigInt = redeemAmount ? parseEther(redeemAmount) : 0n;

  // For position redemption, user gets full amount back after waiting period
  const calculatedReceive = redeemAmount
    ? parseFloat(redeemAmount).toFixed(2)
    : "0.00";

  const dollarValue = redeemAmount
    ? (parseFloat(redeemAmount) * 1).toFixed(2)
    : "0.00";

  // Check if user has sufficient balance
  const hasInsufficientBalance =
    position?.data &&
    redeemAmountBigInt > 0n &&
    position.data.remainingDeposit < redeemAmountBigInt;

  // Check if approval is needed
  const needsApproval =
    allowance !== undefined &&
    redeemAmountBigInt > 0n &&
    allowance < redeemAmountBigInt;

  // Check if we have sufficient allowance
  const hasSufficientAllowance = !needsApproval;

  // Determine current step based on allowance and redemption success
  const getCurrentStep = () => {
    if (isRedemptionSuccess) return 2;
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
    setRedeemAmount(formatEther(position?.data?.remainingDeposit || 0n));
  };

  const handleStartRedemption = () => {
    if (!hasInsufficientBalance && redeemAmountBigInt > 0n) {
      setShowSteps(true);
    }
  };

  const handleApprove = async () => {
    if (!tokenId || redeemAmountBigInt === 0n) return;

    try {
      await approveReceiptToken({
        tokenId,
        amount: redeemAmountBigInt,
      });
    } catch (error) {
      console.error("Failed to approve receipt tokens:", error);
    }
  };

  const handleRedeem = async () => {
    if (!position || !redeemAmount || redeemAmountBigInt === 0n) return;

    try {
      startPositionRedemption({
        positionId: position.id,
        amount: redeemAmountBigInt,
        queryKey: ["userPositions"],
      });
    } catch (error) {
      console.error("Failed to redeem position:", error);
    }
  };

  // Use dynamic token name with fallback (no loading state to avoid jerkiness)
  const displayTokenName = tokenName || `Receipt-${term}`;

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
      title: "Position Redemption",
      detail: `${redeemAmount} ${displayTokenName} → ${calculatedReceive} USDS`,
      icon: USDSIcon,
      isActive: currentStep === 2,
      isCompleted: isRedemptionSuccess,
      isLoading: currentStep === 2 && isRedemptionPending,
      hash: isRedemptionSuccess ? redemptionHash : undefined,
    },
  ];

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setRedeemAmount("");
      setShowSteps(false);
    }
  }, [isOpen]);

  // Steps view
  if (showSteps) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full sm:max-w-md mx-auto p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 text-center">
            {isRedemptionSuccess ? (
              <div className="w-full mx-auto items-center justify-center">
                <div className="flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green" />
                </div>
                <p className="text-xl font-semibold mb-2 text-center">
                  Congrats, all done!
                </p>
                <p className="text-sm text-secondary-t text-center">
                  Your position redemption has been started.
                </p>
              </div>
            ) : (
              <>
                <DialogTitle className="text-xl">
                  Position Redemption
                </DialogTitle>
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
                  <div className={`flex items-center justify-between p-4`}>
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
                          <div className="text-xs text-secondary-t rounded-full border px-2 py-1 text-center border-a10-b">
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

                    <div className="flex items-center gap-2">
                      {step.icon && (
                        <img src={step.icon} alt="" className="w-5 h-5" />
                      )}
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="border-b border-a5-b mx-4" />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              {isRedemptionSuccess ? (
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
                    }}
                    disabled={isApproving || isRedemptionPending}
                    size="lg"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={currentStep === 1 ? handleApprove : handleRedeem}
                    disabled={
                      isApproving ||
                      isRedemptionPending ||
                      !redeemAmount ||
                      redeemAmount === "0" ||
                      !position ||
                      (currentStep === 1 && !tokenId)
                    }
                    className="flex-1"
                    size="lg"
                  >
                    {isApproving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Approving...
                      </>
                    ) : isRedemptionPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Starting Redemption...
                      </>
                    ) : currentStep === 2 ? (
                      "Start Position Redemption"
                    ) : (
                      "Approve Receipt Tokens"
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

  // Input view
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full sm:max-w-md mx-auto p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl">Redeem Position</DialogTitle>
          <p className="text-sm text-secondary-t">
            Position #{position?.id.toString()}
          </p>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-6">
          {/* Position Info */}
          <div className="bg-surface-a3 rounded-3xl p-4 border border-a3-b">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Position Details</label>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-secondary-t">Term</span>
                  <span className="text-xs">{term}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-secondary-t">Expiry</span>
                  <span className="text-xs">
                    {position?.data
                      ? new Date(
                          position.data.expiry * 1000
                        ).toLocaleDateString()
                      : "--"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-secondary-t">
                    Waiting Period
                  </span>
                  <span className="text-xs">
                    {redemptionTimelineDays > 0
                      ? `${redemptionTimelineDays} days`
                      : "Ready to redeem"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Amount Section */}
          <div className="bg-surface-a3 rounded-3xl p-4 border border-a3-b">
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium">Amount to Redeem</label>
              </div>
              <div className="flex items-center justify-between">
                <Input
                  type="number"
                  value={redeemAmount}
                  onChange={(e) => setRedeemAmount(e.target.value)}
                  min="0"
                  onScroll={(e) => e.currentTarget.blur()}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="0.00"
                  className="md:text-4xl h-14 placeholder:text-disabled-t border-0 shadow-none pl-0 w-[60%]"
                />
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-surface-a3 rounded-full px-3 py-2 border border-a3-b">
                    <img src={cdUSDSIcon} alt="Receipt Token" className="w-5 h-5" />
                    <span className="font-medium text-sm">{displayTokenName}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm text-secondary-t">
                <span>${dollarValue}</span>
                <div className="flex items-center gap-2">
                  <span>Available: {availableAmount}</span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleMaxClick}
                    className="h-6 px-2 text-xs"
                  >
                    Max
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* You Receive Section */}
          <div className="bg-surface-a3 rounded-3xl p-4 border border-a3-b">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">You Receive</label>
                <div className="flex items-center gap-2">
                  <img src={USDSIcon} alt="USDS" className="w-5 h-5" />
                  <span>{calculatedReceive} USDS</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-secondary-t">Redemption Fee</div>
                  <div className="text-xs text-green">0%</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-secondary-t">
                    Processing Time
                  </div>
                  <div className="text-xs">
                    {redemptionTimelineDays > 0
                      ? `${redemptionTimelineDays} days`
                      : "Immediate"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={handleStartRedemption}
            disabled={
              !redeemAmount ||
              redeemAmount === "0" ||
              !position ||
              hasInsufficientBalance
            }
            className="w-full"
            size="lg"
          >
            {hasInsufficientBalance
              ? "Insufficient Balance"
              : !redeemAmount || redeemAmount === "0"
              ? "Enter Amount"
              : "Start Position Redemption"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
