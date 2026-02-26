import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InfoIcon, CheckCircle, ExternalLink, Loader2 } from "lucide-react";
import { useWrapPosition } from "@/lib/hooks/cds/useWrapPosition";
import { useUnwrapPosition } from "@/lib/hooks/cds/useUnwrapPosition";
import { formatEther } from "viem";
import { Link } from "react-router-dom";
import { blockExplorerTxBaseUrl } from "@/lib/helpers";
import { formatTermSuffix } from "@/lib/utils";

interface Position {
  id: bigint;
  data: {
    remainingDeposit: bigint;
    conversionPrice: bigint;
    periodMonths: number;
    expiry: bigint;
  };
}

interface WrapPositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  position?: Position;
  queryKey?: unknown[];
  mode: "wrap" | "unwrap";
}

export const WrapPositionModal: React.FC<WrapPositionModalProps> = ({
  isOpen,
  onClose,
  position,
  queryKey,
  mode,
}) => {
  const {
    wrap,
    isPending: isWrapPending,
    isSuccess: isWrapSuccess,
    hash: wrapHash,
  } = useWrapPosition();
  const {
    unwrap,
    isPending: isUnwrapPending,
    isSuccess: isUnwrapSuccess,
    hash: unwrapHash,
  } = useUnwrapPosition();

  const isPending = mode === "wrap" ? isWrapPending : isUnwrapPending;
  const isSuccess = mode === "wrap" ? isWrapSuccess : isUnwrapSuccess;
  const transactionHash = mode === "wrap" ? wrapHash : unwrapHash;

  const handleAction = () => {
    if (!position) return;

    try {
      if (mode === "wrap") {
        wrap({
          positionId: position.id,
          queryKey,
        });
      } else {
        unwrap({
          positionId: position.id,
          queryKey,
        });
      }
    } catch (error) {
      console.error(`Failed to ${mode} position:`, error);
    }
  };

  const handleClose = () => {
    onClose();
  };

  // Helper functions for formatting
  const formatAmount = (amount: bigint) => {
    return parseFloat(formatEther(amount)).toFixed(2);
  };

  const formatTxHash = (hash?: `0x${string}`) => {
    if (!hash) return "";
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };


  const formatConversionPrice = (price: bigint) => {
    return parseFloat(formatEther(price)).toFixed(2);
  };

  // Success screen
  if (isSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="w-full sm:max-w-md mx-auto p-0 gap-0">
          <div className="px-6 pt-6 pb-6 text-center">
            {/* NFT Preview Card */}
            {mode === "wrap" && (
              <div className="bg-slate-800 rounded-2xl p-6 mb-6">
                <div className="flex justify-between items-center text-white text-sm mb-4">
                  <span>Olympus</span>
                </div>

                {/* Large Omega Symbol */}
                <div className="w-24 h-24 mx-auto mb-4 bg-slate-600 rounded-full flex items-center justify-center">
                  <div className="text-white text-4xl font-bold">Ω</div>
                </div>

                {/* NFT Details */}
                <div className="text-white space-y-2">
                  <div className="text-xs opacity-75">
                    {position
                      ? `${formatTermSuffix(
                          position.data.periodMonths
                        )} Call Convertible Deposit`
                      : "Convertible Deposit"}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="opacity-75">Amount</div>
                      <div>
                        {position
                          ? `${formatAmount(
                              position.data.remainingDeposit
                            )} USDS`
                          : "--"}
                      </div>
                    </div>
                    <div>
                      <div className="opacity-75">Conversion Rate</div>
                      <div>
                        {position
                          ? `${formatConversionPrice(
                              position.data.conversionPrice
                            )} USDS/OHM`
                          : "--"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            <div className="space-y-2 mb-6">
              <h3 className="text-xl font-semibold">Congrats, all done!</h3>
              <p className="text-sm text-secondary-t">
                Your transaction has been executed.
              </p>
            </div>

            {/* Transaction Link */}
            <div className="bg-surface-a3 rounded-2xl p-4 border border-a3-b mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green" />
                  <span className="text-sm font-medium">
                    {mode === "wrap"
                      ? "Wrap Position Into NFT"
                      : "Unwrap Position"}
                  </span>
                </div>
                {transactionHash && (
                  <Link
                    target="_blank"
                    to={`${blockExplorerTxBaseUrl}/${transactionHash}`}
                    className="flex items-center gap-1 text-blue-500 hover:text-blue-700"
                  >
                    <span className="text-sm font-mono">
                      {formatTxHash(transactionHash)}
                    </span>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </div>

            {/* Close Button */}
            <Button onClick={handleClose} className="w-full" size="lg">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Initial information screen
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full sm:max-w-md mx-auto p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl">
            {mode === "wrap" ? "Wrap Position Into NFT" : "Unwrap Position"}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6">
          <div className="bg-blue/10 rounded-3xl p-4 border border-blue/5">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <InfoIcon className="h-4 w-4 text-blue-500" />
              </div>
              <div className="space-y-2">
                <div className="font-medium text-sm">Important Note</div>
                <div className="text-xs text-secondary-t font-light leading-relaxed">
                  {mode === "wrap" ? (
                    <>
                      Wrapping mints an NFT that represents a holder, the right
                      to convert a fixed number of cdUSDS tokens into OHM. The
                      NFT is transferable but conversion requires that the
                      holder also have cdUSDS tokens.
                    </>
                  ) : (
                    <>
                      Unwrapping burns the NFT and reactivates your position
                      without the right to transfer it.
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Button
              onClick={handleAction}
              disabled={isPending || !position}
              className="w-full"
              size="lg"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === "wrap" ? "Wrapping..." : "Unwrapping..."}
                </>
              ) : mode === "wrap" ? (
                "Wrap into NFT"
              ) : (
                "Unwrap Position"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
