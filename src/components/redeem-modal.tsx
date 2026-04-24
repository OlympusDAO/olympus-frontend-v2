import type React from "react";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckIcon, ExternalLink, CheckCircle2 } from "lucide-react";
import { Icon, type IconName } from "@/components/icon";
import { formatEther, parseEther } from "viem";
import {
  useInstantRedemption,
  usePreviewReclaim,
  useReclaimRate,
} from "@/lib/hooks/cds/useInstantRedemption";
import { useFullRedemption } from "@/lib/hooks/cds/useFullRedemption";
import { ContractName, getContractAddress, requireContractAddress } from "@/lib/contracts";
import { useAccount, useChainId } from "wagmi";
import { Link } from "react-router-dom";
import { blockExplorerTxBaseUrl } from "@/lib/helpers";
import { useReceiptTokenBalance, useReceiptTokenId } from "@/lib/hooks/cds/useReceiptToken";
import {
  useFlexibleReceiptTokenAllowance,
  useFlexibleApproveReceiptToken,
} from "@/lib/hooks/cds/useFlexibleReceiptTokenApproval";
import { useDepositManager } from "@/lib/hooks/cds/useDepositManager";
import { formatTermSuffix } from "@/lib/utils";
import { trackRedeemInstant, trackRedeemFull } from "@/lib/analytics";

interface TokenBalance {
  asset: string;
  periodMonths: number;
  totalBalance: bigint;
  displayName: string;
}

interface RedeemModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenBalance?: TokenBalance;
}

type RedemptionType = "instant" | "full";

export const RedeemModal: React.FC<RedeemModalProps> = ({ isOpen, onClose, tokenBalance }) => {
  const [redeemAmount, setRedeemAmount] = useState("");
  const [redemptionType, setRedemptionType] = useState<RedemptionType>("full");
  const [showSteps, setShowSteps] = useState(false);
  const { address: userAddress } = useAccount();
  const chainId = useChainId();

  // Contract hooks
  const {
    reclaim,
    isPending: isInstantPending,
    isSuccess: isInstantSuccess,
    hash: instantHash,
  } = useInstantRedemption();

  const {
    startRedemption,
    isPending: isFullPending,
    isSuccess: isFullSuccess,
    hash: fullHash,
  } = useFullRedemption();

  // Receipt token hooks for instant redemption approval
  const { tokenId } = useReceiptTokenId(
    tokenBalance?.asset as `0x${string}` | undefined,
    tokenBalance?.periodMonths,
  );

  const { balance: receiptTokenBalance } = useReceiptTokenBalance(
    tokenBalance?.asset as `0x${string}` | undefined,
    tokenBalance?.periodMonths,
    userAddress,
  );

  const facilityAddress = getContractAddress(ContractName.CONVERTIBLE_DEPOSIT_FACILITY, chainId);

  const { depositManagerAddress } = useDepositManager(facilityAddress);

  // Get the target contract address based on redemption type
  const targetContractAddress = chainId
    ? redemptionType === "instant"
      ? depositManagerAddress
      : requireContractAddress(ContractName.DEPOSIT_REDEMPTION_VAULT, chainId)
    : undefined;

  const { allowance } = useFlexibleReceiptTokenAllowance(
    tokenId,
    userAddress,
    targetContractAddress,
  );

  const {
    approveReceiptToken,
    isPending: isApproving,
    isSuccess: approvalSuccess,
    hash: approvalHash,
    reset: resetApproval,
  } = useFlexibleApproveReceiptToken(targetContractAddress);

  // Derived states
  const isRedeeming = isInstantPending || isFullPending;
  const isSuccess = isInstantSuccess || isFullSuccess;

  // Helper functions
  const formatAmount = (amount: bigint) => {
    return parseFloat(formatEther(amount)).toFixed(2);
  };

  // Token balance data
  const availableAmount = tokenBalance ? formatAmount(tokenBalance.totalBalance) : "0";
  const term = tokenBalance ? formatTermSuffix(tokenBalance.periodMonths) : "3m";

  // Use the display name from tokenBalance (already fetched from ReceiptTokenManager)
  const displayTokenName = tokenBalance?.displayName || `Receipt-${term}`;

  // Calculate redemption timeline based on deposit period
  const redemptionTimelineDays = tokenBalance ? tokenBalance.periodMonths * 30 : 30;

  // Parse redeem amount as bigint
  const redeemAmountBigInt = redeemAmount ? parseEther(redeemAmount) : 0n;

  // Use preview reclaim for instant redemption to get actual amounts
  const { data: previewReclaimData } = usePreviewReclaim({
    depositToken: tokenBalance?.asset || "",
    depositPeriod: tokenBalance?.periodMonths || 3,
    amount: redeemAmountBigInt,
    enabled: redemptionType === "instant" && !!tokenBalance && redeemAmountBigInt > 0n,
  });

  // Fetch the actual reclaim rate from the contract
  const { feePercentage: contractFeePercentage } = useReclaimRate({
    asset: tokenBalance?.asset || "",
    depositPeriod: tokenBalance?.periodMonths || 3,
    enabled: !!tokenBalance,
  });

  // Calculate fee and receive amounts
  const instantFeePercentage = contractFeePercentage ?? 2.5;
  const calculatedReceive =
    redemptionType === "instant" && previewReclaimData
      ? formatAmount(previewReclaimData as bigint)
      : redemptionType === "full" && redeemAmount
        ? parseFloat(redeemAmount).toFixed(2)
        : "0.00";

  const instantFee =
    redemptionType === "instant" && redeemAmount && previewReclaimData
      ? (parseFloat(redeemAmount) - parseFloat(calculatedReceive)).toFixed(2)
      : "0";

  const dollarValue = redeemAmount ? (parseFloat(redeemAmount) * 1).toFixed(2) : "0.00";

  // Check if user has sufficient balance and receipt tokens (for instant redemption)
  const hasInsufficientBalance =
    tokenBalance && redeemAmountBigInt > 0n && tokenBalance.totalBalance < redeemAmountBigInt;

  const hasInsufficientReceiptTokens =
    redemptionType === "instant" &&
    receiptTokenBalance !== undefined &&
    redeemAmountBigInt > 0n &&
    receiptTokenBalance < redeemAmountBigInt;

  // Check if approval is needed for both instant and full redemption
  const needsApproval =
    allowance !== undefined && redeemAmountBigInt > 0n && allowance < redeemAmountBigInt;

  // Check if we have sufficient allowance
  const hasSufficientAllowance = !needsApproval;

  // Determine current step based on allowance and redemption success
  const getCurrentStep = () => {
    if (isSuccess) return 2;
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
    setRedeemAmount(formatEther(tokenBalance?.totalBalance || 0n));
  };

  const handleStartRedemption = () => {
    if (!hasInsufficientReceiptTokens && redeemAmountBigInt > 0n) {
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
    if (!tokenBalance || !redeemAmount || redeemAmountBigInt === 0n || !chainId) return;

    try {
      if (redemptionType === "instant") {
        // Call ConvertibleDepositFacility.reclaim()
        await reclaim({
          depositToken: tokenBalance.asset,
          depositPeriod: tokenBalance.periodMonths,
          amount: redeemAmountBigInt,
          queryKey: ["tokenBalances"],
        });
      } else {
        // Call DepositRedemptionVault.startRedemption()
        const facilityAddress = requireContractAddress(
          ContractName.CONVERTIBLE_DEPOSIT_FACILITY,
          chainId,
        );

        await startRedemption({
          depositPeriod: tokenBalance.periodMonths,
          amount: redeemAmountBigInt,
          facility: facilityAddress,
          queryKey: ["tokenBalances"],
        });
      }
    } catch (error) {
      console.error("Failed to redeem:", error);
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
      title: redemptionType === "instant" ? "Instant Redemption" : "Full Redemption",
      detail:
        redemptionType === "instant"
          ? `${redeemAmount} USDS-${term} → ${calculatedReceive} USDS`
          : `${redeemAmount} USDS-${term} → ${calculatedReceive} USDS`,
      icon: redemptionType === "instant" ? ("USDSColorTokenIcon" as IconName) : undefined,
      isActive: currentStep === 2,
      isCompleted: isSuccess,
      isLoading: currentStep === 2 && isRedeeming,
      hash: isSuccess ? (redemptionType === "instant" ? instantHash : fullHash) : undefined,
    },
  ];

  useEffect(() => {
    if (isInstantSuccess) {
      trackRedeemInstant({
        redeemAmount,
        term,
        txHash: instantHash,
      });
    }
  }, [isInstantSuccess, redeemAmount, term, instantHash]);

  useEffect(() => {
    if (isFullSuccess) {
      trackRedeemFull({
        redeemAmount,
        term,
        txHash: fullHash,
      });
    }
  }, [isFullSuccess, redeemAmount, term, fullHash]);

  // Refetch allowance when approval succeeds to get updated on-chain data
  useEffect(() => {
    if (approvalSuccess) {
      // Note: allowance refetch would depend on the specific hook implementation
      // For now, the query should auto-refetch after successful approval
    }
  }, [approvalSuccess]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setRedeemAmount("");
      setRedemptionType("full");
      setShowSteps(false);
    }
  }, [isOpen]);

  // Steps view
  if (showSteps) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full sm:max-w-md mx-auto p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 text-center">
            {isSuccess ? (
              <div className="w-full mx-auto items-center justify-center">
                <div className="flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green" />
                </div>
                <p className="text-xl font-semibold mb-2 text-center">Congrats, all done!</p>
                <p className="text-sm text-secondary-t text-center">
                  Your transactions have been executed.
                </p>
              </div>
            ) : (
              <>
                <DialogTitle className="text-xl">
                  {redemptionType === "instant" ? "Instant Redemption" : "Full Redemption"}
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
                      {step.icon && <Icon name={step.icon} size={20} />}
                    </div>
                  </div>
                  {index < steps.length - 1 && <div className="border-b border-a5-b mx-4" />}
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              {isSuccess ? (
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
                    disabled={isApproving || isRedeeming}
                    size="lg"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={currentStep === 1 ? handleApprove : handleRedeem}
                    disabled={
                      isApproving ||
                      isRedeeming ||
                      !redeemAmount ||
                      redeemAmount === "0" ||
                      !tokenBalance ||
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
                    ) : isRedeeming ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {redemptionType === "instant" ? "Redeeming..." : "Starting Redemption..."}
                      </>
                    ) : currentStep === 2 ? (
                      redemptionType === "instant" ? (
                        "Redeem Instantly"
                      ) : (
                        "Start Full Redemption"
                      )
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
          <DialogTitle className="text-xl">Redeem Tokens</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-6">
          {/* Redemption Type Selection */}
          <div className="space-y-3">
            {/* Instant Redemption Option */}
            <button
              type="button"
              className={`p-4 cursor-pointer transition-all border rounded-2xl ${
                redemptionType === "instant" ? "border-primary" : "border-a10-b hover:border-20-b"
              }`}
              onClick={() => setRedemptionType("instant")}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-md">Instant Redemption</h3>
                    <div className="bg-yellow/20 text-yellow px-2 py-1 rounded-full text-xs font-medium">
                      -{instantFeePercentage}%
                    </div>
                  </div>
                  <p className="text-secondary-t text-sm font-light">
                    Redeem immediately with a {instantFeePercentage}% fee.
                  </p>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    redemptionType === "instant" ? "border-primary bg-primary-t" : "border-gray-300"
                  }`}
                >
                  {redemptionType === "instant" && (
                    <div className="w-2 h-2 bg-surface-bg-l1 rounded-full" />
                  )}
                </div>
              </div>
            </button>

            {/* Full Redemption Option */}
            <button
              type="button"
              className={`p-4 cursor-pointer transition-all border rounded-2xl ${
                redemptionType === "full" ? "border-primary" : "border-a10-b hover:border-20-b"
              }`}
              onClick={() => setRedemptionType("full")}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-md">Full Redemption</h3>
                    <div className="bg-blue/20 text-blue px-2 py-1 rounded-2xl text-xs font-medium">
                      {redemptionTimelineDays} days
                    </div>
                  </div>
                  <p className="text-secondary-t text-sm font-light">
                    Deposit receipt tokens into the vault and redeem the full deposit amount after{" "}
                    {redemptionTimelineDays} days. Can be canceled at any time before the
                    redemption.
                  </p>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    redemptionType === "full" ? "border-primary bg-primary-t" : "border-gray-300"
                  }`}
                >
                  {redemptionType === "full" && (
                    <div className="w-2 h-2 bg-surface-bg-l1 rounded-full" />
                  )}
                </div>
              </div>
            </button>
          </div>

          {/* Amount Section */}
          <div className="bg-surface-a3 rounded-3xl p-4 border border-a3-b">
            <div>
              <div className="flex items-center justify-between mb-3">
                <label htmlFor="redeemAmount" className="text-sm font-medium">
                  Amount to Redeem
                </label>
              </div>
              <div className="flex items-center justify-between">
                <Input
                  id="redeemAmount"
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
                    <Icon name="cdUSDSIcon" size={20} />
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
                <p className="text-sm font-medium">You Receive</p>
                <div className="flex items-center gap-2">
                  <Icon name="USDSColorTokenIcon" size={20} />
                  <span>{calculatedReceive} USDS</span>
                </div>
              </div>

              {redemptionType === "instant" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-secondary-t">
                      Redemption Fee ({instantFeePercentage}%)
                    </div>
                    <div className="text-xs text-red/80">-{instantFee} USDS</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-secondary-t">Processing Time</div>
                    <div className="text-xs">Immediate</div>
                  </div>
                </div>
              )}

              {redemptionType === "full" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-secondary-t">Redemption Fee</div>
                    <div className="text-xs text-green">0%</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-secondary-t">Waiting Period</div>
                    <div className="text-xs">{redemptionTimelineDays} days</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Button
            onClick={handleStartRedemption}
            disabled={
              !redeemAmount ||
              redeemAmount === "0" ||
              !tokenBalance ||
              hasInsufficientBalance ||
              hasInsufficientReceiptTokens
            }
            className="w-full"
            size="lg"
          >
            {hasInsufficientBalance
              ? "Insufficient Balance"
              : hasInsufficientReceiptTokens
                ? "Insufficient Receipt Tokens"
                : !redeemAmount || redeemAmount === "0"
                  ? "Enter Amount"
                  : redemptionType === "instant"
                    ? "Redeem Instantly"
                    : "Start Full Redemption"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
