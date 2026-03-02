import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckIcon, AlertTriangleIcon } from "lucide-react";
import { useCancelRedemption } from "@/lib/hooks/cds/useCancelRedemption";

interface PendingRedemption {
  redemptionId: number;
  asset: string;
  periodMonths: number;
  amount: bigint;
  displayName: string;
  redeemableAt: number;
}

interface CancelRedemptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingRedemption?: PendingRedemption;
}

export const CancelRedemptionModal: React.FC<CancelRedemptionModalProps> = ({
  isOpen,
  onClose,
  pendingRedemption,
}) => {
  const { cancelRedemption, isPending: isCancelling, isSuccess, hash } = useCancelRedemption();

  // Get the period text for display
  const periodText =
    pendingRedemption?.periodMonths === 1
      ? "30-day"
      : pendingRedemption?.periodMonths === 3
        ? "90-day"
        : pendingRedemption?.periodMonths === 6
          ? "180-day"
          : `${(pendingRedemption?.periodMonths || 0) * 30}-day`;

  const handleCancel = async () => {
    if (!pendingRedemption) return;

    try {
      await cancelRedemption({
        redemptionId: pendingRedemption.redemptionId,
        amount: pendingRedemption.amount,
        queryKey: ["userRedemptions"],
      });
    } catch (error) {
      console.error("Failed to cancel redemption:", error);
    }
  };

  // Show success state
  if (isSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full sm:max-w-md mx-auto p-0 gap-0">
          <div className="px-6 pt-6 pb-6 text-center">
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-green/20 rounded-full flex items-center justify-center">
                <CheckIcon className="h-8 w-8 text-green" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Congrats, all done!</h3>
                <p className="text-sm text-secondary-t mt-2">Your transaction has been executed.</p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckIcon className="h-4 w-4 text-green" />
                  <span className="text-sm font-medium">Cancel Redemption Process</span>
                </div>
                <div className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer">
                  {hash ? `${hash.slice(0, 4)}...${hash.slice(-4)}` : "0xF4...3G57"} ↗
                </div>
              </div>

              <Button onClick={onClose} className="w-full mt-4">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Default form view
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full sm:max-w-lg mx-auto p-0 gap-0">
        <DialogHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-4">
          <DialogTitle className="text-xl">Cancel Redemption Process</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-6">
          {/* Warning Section */}
          <div className="bg-yellow/10 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <AlertTriangleIcon className="h-5 w-5 text-yellow" />
              </div>
              <div className="space-y-2">
                <div className="font-medium text-sm">
                  Cancelling will restart your {periodText} timer
                </div>
                <div className="text-sm text-secondary-t leading-relaxed font-light">
                  If you cancel the redemption queue now, your {periodText} waiting period will
                  restart. You'll need to wait the full {periodText.replace("-day", " days")} again
                  before your tokens become redeemable.
                </div>
              </div>
            </div>
          </div>

          {/* Cancel Button */}
          <Button
            onClick={handleCancel}
            disabled={isCancelling || !pendingRedemption}
            className="w-full"
            size="lg"
          >
            {isCancelling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cancelling...
              </>
            ) : (
              "Cancel Redemption & Reset Timer"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
