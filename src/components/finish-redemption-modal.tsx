import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckIcon } from "lucide-react";
import { useFinishRedemption } from "@/lib/hooks/cds/useFinishRedemption";
import { trackFinishRedemption } from "@/lib/analytics";

interface PendingRedemption {
  redemptionId: number;
  asset: string;
  periodMonths: number;
  amount: bigint;
  displayName: string;
  redeemableAt: number;
}

interface FinishRedemptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingRedemption?: PendingRedemption;
}

export const FinishRedemptionModal: React.FC<FinishRedemptionModalProps> = ({
  isOpen,
  onClose,
  pendingRedemption,
}) => {
  const { finishRedemption, isPending: isCompleting, isSuccess, hash } = useFinishRedemption();

  // Get the period text for display
  const periodText =
    pendingRedemption?.periodMonths === 1
      ? "30-day"
      : pendingRedemption?.periodMonths === 3
        ? "90-day"
        : pendingRedemption?.periodMonths === 6
          ? "180-day"
          : `${(pendingRedemption?.periodMonths || 0) * 30}-day`;

  const handleFinish = async () => {
    if (!pendingRedemption) return;

    finishRedemption({
      redemptionId: pendingRedemption.redemptionId,
    });
  };

  // Close modal when transaction is successful
  useEffect(() => {
    if (!isSuccess) return;
    const amount = pendingRedemption ? String(Number(pendingRedemption.amount) / 1e18) : "0";
    trackFinishRedemption({ amount, txHash: hash });
  }, [isSuccess]);

  if (isSuccess) {
    setTimeout(() => {
      onClose();
    }, 2000);
  }

  const formatAmount = (amount: bigint): string => {
    return parseFloat((Number(amount) / 1e18).toFixed(2)).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Redemption</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Show different states */}
          {!isCompleting && !isSuccess && (
            <>
              <div className="space-y-2">
                <p className="text-sm text-secondary-t">
                  You are about to complete the redemption of:
                </p>
                <div className="bg-surface-bg-l1 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">
                      {pendingRedemption && formatAmount(pendingRedemption.amount)}{" "}
                      {pendingRedemption?.displayName}
                    </span>
                  </div>
                  <div className="text-sm text-secondary-t mt-1">{periodText} redemption</div>
                </div>
                <p className="text-sm text-secondary-t">
                  This will transfer the underlying assets to your wallet.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="tertiary"
                  className="flex-1"
                  onClick={onClose}
                  disabled={isCompleting}
                >
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleFinish} disabled={isCompleting}>
                  Complete Redemption
                </Button>
              </div>
            </>
          )}

          {/* Processing state */}
          {isCompleting && !isSuccess && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">Completing redemption...</p>
                <p className="text-sm text-secondary-t mt-1">
                  Please confirm the transaction in your wallet
                </p>
              </div>
            </div>
          )}

          {/* Success state */}
          {isSuccess && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="rounded-full bg-green/20 p-3">
                <CheckIcon className="h-12 w-12 text-green" />
              </div>
              <div className="text-center">
                <p className="font-medium">Redemption completed!</p>
                <p className="text-sm text-secondary-t mt-1">
                  Your funds have been transferred to your wallet
                </p>
                {hash && (
                  <a
                    href={`https://etherscan.io/tx/${hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline mt-2 inline-block"
                  >
                    View transaction
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
