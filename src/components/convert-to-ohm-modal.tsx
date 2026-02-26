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
import OHMIcon from "@/assets/OHM.png";
import { usePreviewConvert } from "@/lib/hooks/cds/usePreviewConvert";
import { useConvertPosition } from "@/lib/hooks/cds/useConvertPosition";

import { useReceiptTokenBalance, useReceiptTokenName } from "@/lib/hooks/cds/useReceiptToken";
import {
  useReceiptTokenAllowance,
  useApproveReceiptToken,
} from "@/lib/hooks/cds/useReceiptTokenApproval";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { Link } from "react-router-dom";
import { blockExplorerTxBaseUrl } from "@/lib/helpers";
import { formatTermSuffix } from "@/lib/utils";
import { trackConvertToOhm } from "@/lib/analytics";
import { InsufficientReceiptTokens } from "./insufficent-receipt-tokens";

interface Position {
  id: bigint;
  data: {
    remainingDeposit: bigint;
    conversionPrice: bigint;
    periodMonths: number;
    expiry: bigint;
    asset: `0x${string}`;
  };
}

interface ConvertToOHMModalProps {
  isOpen: boolean;
  onClose: () => void;
  position?: Position;
}

export const ConvertToOHMModal: React.FC<ConvertToOHMModalProps> = ({
  isOpen,
  onClose,
  position,
}) => {
  const [convertAmount, setConvertAmount] = useState("");
  const [showSteps, setShowSteps] = useState(false);
  const { address: userAddress } = useAccount();

  // Convert hooks
  const {
    convert,
    isPending: isConverting,
    isSuccess,
    hash: convertHash,
  } = useConvertPosition();

  // Receipt token balance check
  const { balance: receiptTokenBalance, tokenId } = useReceiptTokenBalance(
    position?.data.asset,
    position?.data.periodMonths,
    userAddress
  );

  // Get the token name dynamically
  const { tokenName } = useReceiptTokenName(tokenId);

  // Receipt token allowance check
  const { allowance, refetch: refetchAllowance } = useReceiptTokenAllowance(
    tokenId,
    userAddress
  );

  // Receipt token approval
  const {
    approveReceiptToken,
    isPending: isApproving,
    isSuccess: approvalSuccess,
    hash: approvalHash,
    reset: resetApproval,
  } = useApproveReceiptToken();

  // Helper functions
  const formatAmount = (amount: bigint) => {
    return parseFloat(formatEther(amount)).toFixed(2);
  };


  const formatConversionPrice = (price: bigint) => {
    return parseFloat(formatEther(price)).toFixed(4);
  };

  // Position data
  const term = position
    ? formatTermSuffix(position.data.periodMonths)
    : "3m";

  // Use dynamic token name with fallback (no loading state to avoid jerkiness)
  const displayTokenName = tokenName || `Receipt-${term}`;

  const conversionRate = position
    ? `${formatConversionPrice(position.data.conversionPrice)} USDS/OHM`
    : "--";

  // Parse convert amount as bigint for preview
  const convertAmountBigInt = convertAmount ? parseEther(convertAmount) : 0n;

  // Use preview hook to get actual conversion amounts
  const { data: previewData } = usePreviewConvert({
    positionIds: position ? [position.id] : [],
    amounts: convertAmountBigInt > 0n ? [convertAmountBigInt] : [],
    enabled: !!position && convertAmountBigInt > 0n,
  });

  const calculatedReceive = previewData
    ? (Number(previewData.convertedTokenOut) / 1e9).toFixed(2) // OHM has 9 decimals
    : convertAmount && position
    ? (
        (Number(convertAmountBigInt) * 1e9) /
        Number(position.data.conversionPrice) /
        1e9
      ).toFixed(2)
    : "0";

  // Calculate the maximum convertible amount (minimum of receipt balance and remaining deposit)
  const maxConvertibleAmount =
    position && receiptTokenBalance
      ? receiptTokenBalance < position.data.remainingDeposit
        ? receiptTokenBalance
        : position.data.remainingDeposit
      : receiptTokenBalance || 0n;

  // Check if user has sufficient tokens to convert (considering both receipt balance and remaining deposit)
  const hasInsufficientReceiptTokens =
    convertAmountBigInt > 0n && maxConvertibleAmount < convertAmountBigInt;

  // Check if approval is needed
  const needsApproval =
    allowance !== undefined &&
    convertAmountBigInt > 0n &&
    allowance < convertAmountBigInt;

  // Check if we have sufficient allowance
  const hasSufficientAllowance = !needsApproval;

  // Determine current step based on allowance and conversion success
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
    const amount = formatEther(maxConvertibleAmount);
    setConvertAmount(amount);
  };

  const handleStartConversion = () => {
    if (!hasInsufficientReceiptTokens && convertAmountBigInt > 0n) {
      setShowSteps(true);
    }
  };

  const handleApprove = () => {
    if (!tokenId || convertAmountBigInt === 0n) return;

    try {
      approveReceiptToken({
        tokenId,
        amount: convertAmountBigInt,
      });
    } catch (error) {
      console.error("Failed to approve receipt tokens:", error);
    }
  };

  const handleConvert = () => {
    if (!position || !convertAmount || convertAmountBigInt === 0n) return;

    try {
      convert({
        positionIds: [position.id],
        amounts: [convertAmountBigInt],
        wrappedReceipt: false,
      });
    } catch (error) {
      console.error("Failed to convert position:", error);
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
      title: `Convert to OHM`,
      detail: `${convertAmount} USDS-${term} → ${calculatedReceive} OHM`,
      icon: OHMIcon,
      isActive: currentStep === 2,
      isCompleted: isSuccess,
      isLoading: currentStep === 2 && isConverting,
      hash: isSuccess ? convertHash : undefined,
    },
  ];

  useEffect(() => {
    if (isSuccess) {
      trackConvertToOhm({
        convertAmount,
        term,
        txHash: convertHash,
      });
    }
  }, [isSuccess, convertAmount, term, convertHash]);

  // Refetch allowance when approval succeeds to get updated on-chain data
  useEffect(() => {
    if (approvalSuccess) {
      refetchAllowance();
    }
  }, [approvalSuccess, refetchAllowance]);

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
                <p className="text-xl font-semibold mb-2 text-center">
                  Congrats, all done!
                </p>
                <p className="text-sm text-secondary-t text-center">
                  Your transactions have been executed.
                </p>
              </div>
            ) : (
              <>
                <DialogTitle className="text-xl">Convert to OHM</DialogTitle>
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
                      refetchAllowance(); // Refetch to get latest allowance data
                    }}
                    disabled={isApproving || isConverting}
                    size="lg"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={currentStep === 1 ? handleApprove : handleConvert}
                    disabled={
                      isApproving ||
                      isConverting ||
                      !convertAmount ||
                      convertAmount === "0" ||
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
                    ) : isConverting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Converting...
                      </>
                    ) : currentStep === 2 ? (
                      "Convert to OHM"
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
          <DialogTitle className="text-xl">Convert to OHM</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-6">
          <div className="bg-surface-a3 rounded-3xl p-4 border border-a3-b">
            {/* Amount Section */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Amount</label>
              </div>
              <div className="flex items-center justify-between">
                <Input
                  type="number"
                  value={convertAmount}
                  onChange={(e) => setConvertAmount(e.target.value)}
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
                <span></span>
                <div className="flex items-center gap-2">
                  <span>Available: {formatAmount(maxConvertibleAmount)}</span>
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

          <div className="bg-surface-a3 rounded-3xl p-4 border border-a3-b">
            {/* You Receive Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">You Receive</label>
                <div className="flex items-center gap-2">
                  <img src={OHMIcon} alt="OHM" className="w-5 h-5" />
                  <span>{calculatedReceive} OHM</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-secondary-t font-light">
                    Conversion Price
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs">{conversionRate}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Receipt Token Info */}
          {hasInsufficientReceiptTokens && (
            <InsufficientReceiptTokens tokenName={term} />
          )}

          <Button
            onClick={handleStartConversion}
            disabled={
              !convertAmount ||
              convertAmount === "0" ||
              !position ||
              hasInsufficientReceiptTokens
            }
            className="w-full"
            size="lg"
          >
            {hasInsufficientReceiptTokens
              ? "Insufficient Receipt Tokens"
              : !convertAmount || convertAmount === "0"
              ? "Enter Amount"
              : "Convert to OHM"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
