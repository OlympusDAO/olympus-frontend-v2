import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckIcon, Loader2, ExternalLink, AlertTriangle } from "lucide-react";
import { useCancelLimitOrder } from "@/lib/hooks/cds/useCancelLimitOrder";
import { trackCancelLimitOrder } from "@/lib/analytics";
import { blockExplorerTxBaseUrl } from "@/lib/helpers";
import { formatEther } from "viem";
import { formatMaxPrice } from "@/lib/utils/priceCalculations";

interface CancelLimitOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: bigint;
  orderData: {
    depositBudget: bigint;
    depositSpent: bigint;
    incentiveBudget: bigint;
    incentiveSpent: bigint;
    maxPrice: bigint;
    depositPeriod: number;
  };
}

export const CancelLimitOrderModal: React.FC<CancelLimitOrderModalProps> = ({
  isOpen,
  onClose,
  orderId,
  orderData,
}) => {
  // const _chainId = useChainId();

  // Cancel order hook
  const { cancelOrder, isPending, isSuccess, hash } = useCancelLimitOrder();

  // Calculate remaining amounts
  const remainingDeposit = orderData.depositBudget - orderData.depositSpent;
  const remainingIncentive = orderData.incentiveBudget - orderData.incentiveSpent;
  const totalRemaining = remainingDeposit + remainingIncentive;

  useEffect(() => {
    if (!isSuccess) return;
    trackCancelLimitOrder({ orderId: orderId.toString(), txHash: hash });
  }, [isSuccess]);

  const handleCancel = () => {
    cancelOrder({ orderId });
  };

  const handleClose = () => {
    onClose();
  };

  const formatAmount = (amount: bigint) => {
    return parseFloat(formatEther(amount)).toFixed(2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel Limit Order</DialogTitle>
        </DialogHeader>

        {!isSuccess ? (
          <div className="space-y-4">
            {/* Warning */}
            <div className="bg-yellow/10 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <AlertTriangle className="h-5 w-5 text-yellow" />
                </div>
                <div className="space-y-2">
                  <div className="font-medium text-sm">Cancel Order</div>
                  <div className="text-sm text-secondary-t leading-relaxed font-light">
                    This will cancel your limit order and return your remaining USDS. Any partially
                    filled portions will remain as positions.
                  </div>
                </div>
              </div>
            </div>

            {/* Order Details */}
            <div className="bg-surface-a3 rounded-lg p-4 space-y-2">
              <h4 className="font-medium mb-2">Order Details</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-secondary-t">Order ID:</span>
                  <span>#{orderId.toString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-t">Max Price:</span>
                  <span>{formatMaxPrice(orderData.maxPrice)} USDS/OHM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-t">Deposit Budget:</span>
                  <span>{formatAmount(orderData.depositBudget)} USDS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-t">MEV Incentive Budget:</span>
                  <span>{formatAmount(orderData.incentiveBudget)} USDS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-t">Deposit Filled:</span>
                  <span>{formatAmount(orderData.depositSpent)} USDS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-t">Incentive Spent:</span>
                  <span>{formatAmount(orderData.incentiveSpent)} USDS</span>
                </div>
                <div className="flex justify-between border-t border-a5-b pt-2 mt-2 font-medium">
                  <span>You will receive:</span>
                  <span>{formatAmount(totalRemaining)} USDS</span>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <Button onClick={handleCancel} disabled={isPending} className="w-full">
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling Order...
                </>
              ) : (
                "Cancel Order"
              )}
            </Button>

            {hash && (
              <a
                href={`${blockExplorerTxBaseUrl}/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1 justify-center"
              >
                View transaction
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        ) : (
          /* Success State */
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-green/20 rounded-full flex items-center justify-center">
              <CheckIcon className="h-8 w-8 text-green" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Congrats, all done!</h3>
              <p className="text-sm text-secondary-t mt-2">
                Your limit order has been cancelled successfully. {formatAmount(totalRemaining)}{" "}
                USDS has been returned to your wallet.
              </p>
            </div>

            {hash && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckIcon className="h-4 w-4 text-green" />
                  <span className="text-sm font-medium">Cancel Limit Order</span>
                </div>
                <a
                  href={`${blockExplorerTxBaseUrl}/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  {hash.slice(0, 4)}...{hash.slice(-4)} ↗
                </a>
              </div>
            )}

            <Button onClick={handleClose} className="w-full mt-4">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
