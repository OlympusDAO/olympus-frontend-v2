import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckIcon, Loader2, ExternalLink } from "lucide-react";
import { parseEther } from "viem";
import { useAccount, useChainId } from "wagmi";
import { useTokenAllowance } from "@/lib/hooks/useTokenAllowance";
import { useTokenApproval } from "@/lib/hooks/useTokenApproval";
import { useCreateLimitOrder } from "@/lib/hooks/cds/useCreateLimitOrder";
import { getContractAddress, ContractName } from "@/lib/contracts";
import { getTokenAddress } from "@/lib/tokens";
import { blockExplorerTxBaseUrl } from "@/lib/helpers";
import { parseMaxPrice } from "@/lib/utils/priceCalculations";
import { useAuctionParameters } from "@/lib/hooks/cds/useAuctionParameters";

interface CreateLimitOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  depositAmount?: string;
  selectedTerm?: string;
  maxPrice?: string;
  minFillSize?: string;
  incentiveBudget?: string;
}

export const CreateLimitOrderModal: React.FC<CreateLimitOrderModalProps> = ({
  isOpen,
  onClose,
  depositAmount = "0",
  selectedTerm = "3 months",
  maxPrice = "0",
  minFillSize = "0",
  incentiveBudget = "0",
}) => {
  const { address } = useAccount();
  const chainId = useChainId();

  // Get contract and token addresses for current network
  const tokenAddress = getTokenAddress("USDS", chainId);
  const limitOrdersAddress = getContractAddress(ContractName.LIMIT_ORDERS, chainId);

  // Get auction parameters for minimum bid
  const { minimumBid } = useAuctionParameters();

  // Parse the deposit amount to check allowance
  const depositAmountBigInt = parseEther(depositAmount);

  // Parse term to get period in months
  const getMonthsFromTerm = (term: string): number => {
    if (term.includes("1 month")) return 1;
    if (term.includes("3 months")) return 3;
    if (term.includes("6 months")) return 6;
    const match = term.match(/(\d+)\s*months?/);
    return match ? parseInt(match[1], 10) : 1;
  };

  const periodMonths = getMonthsFromTerm(selectedTerm);

  // Parse max price to contract format
  const maxPriceBigInt = parseMaxPrice(maxPrice);

  // Parse min fill size (use auctioneer minimum if not provided)
  const minFillSizeBigInt =
    minFillSize && minFillSize !== "0"
      ? parseEther(minFillSize)
      : minimumBid || 1000000000000000000n;

  // Parse incentive budget
  const incentiveBudgetBigInt =
    incentiveBudget && incentiveBudget !== "0" ? parseEther(incentiveBudget) : 0n;

  // Total amount needed for approval = deposit + incentive
  const totalApprovalAmount = depositAmountBigInt + incentiveBudgetBigInt;

  // Check current allowance (approval needs to go to LimitOrders contract)
  const { allowance, queryKey } = useTokenAllowance(tokenAddress!, address, limitOrdersAddress);

  // Approval hook
  const {
    approve,
    isPending: isApprovePending,
    isSuccess: _isApproveSuccess,
    hash: approveHash,
  } = useTokenApproval();

  // Create order hook (incentive budget always 0n per requirements)
  const {
    createOrder,
    isPending: isCreatePending,
    isSuccess: isCreateSuccess,
    hash: createHash,
  } = useCreateLimitOrder();

  const isApproved = allowance !== undefined && allowance >= totalApprovalAmount;

  const handleApprove = () => {
    if (!tokenAddress || !limitOrdersAddress) return;
    approve({
      tokenAddress,
      spender: limitOrdersAddress,
      amount: totalApprovalAmount,
      queryKey,
    });
  };

  const handleCreateOrder = () => {
    if (!limitOrdersAddress) return;

    createOrder({
      depositPeriod: periodMonths,
      depositBudget: depositAmountBigInt,
      incentiveBudget: incentiveBudgetBigInt,
      maxPrice: maxPriceBigInt,
      minFillSize: minFillSizeBigInt,
    });
  };

  // Determine current step
  const getCurrentStep = () => {
    if (isCreateSuccess) return "success";
    if (isApproved) return "create";
    return "approve";
  };

  const currentStep = getCurrentStep();

  const handleClose = () => {
    onClose();
  };

  // Show congratulations state when order is created successfully
  if (isCreateSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="w-full sm:max-w-md mx-auto p-0 gap-0">
          <div className="px-6 pt-6 pb-6 text-center">
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-green/20 rounded-full flex items-center justify-center">
                <CheckIcon className="h-8 w-8 text-green" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Congrats, all done!</h3>
                <p className="text-sm text-secondary-t mt-2">
                  Your limit order has been created successfully. It will fill when the market price
                  reaches or goes below your max price.
                </p>
              </div>

              {createHash && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckIcon className="h-4 w-4 text-green" />
                    <span className="text-sm font-medium">Create Limit Order</span>
                  </div>
                  <a
                    href={`${blockExplorerTxBaseUrl}/${createHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    {createHash.slice(0, 4)}...{createHash.slice(-4)} ↗
                  </a>
                </div>
              )}

              <Button onClick={handleClose} className="w-full mt-4">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full sm:max-w-md mx-auto p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 text-center">
          <DialogTitle className="text-xl">Create Limit Order</DialogTitle>
          <p className="text-sm text-secondary-t font-light">
            Step {currentStep === "approve" ? "1" : "2"}/2. Proceed with your wallet.
          </p>
        </DialogHeader>

        <div className="px-6 pb-6">
          <div className="bg-surface-a3 border border-a3-b rounded-3xl">
            {/* Step 1: Approve */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-full ring-3 flex items-center justify-center text-sm font-medium ${
                    isApproved
                      ? "text-green"
                      : currentStep === "approve"
                        ? "text-primary-t"
                        : "text-secondary-t ring-a10-b"
                  }`}
                >
                  {isApprovePending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isApproved ? (
                    <CheckIcon className="h-4 w-4" />
                  ) : (
                    "1"
                  )}
                </div>
                <div>
                  <div className="font-medium text-sm">Approve USDS</div>
                  {isApproved && approveHash && (
                    <a
                      href={`${blockExplorerTxBaseUrl}/${approveHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue hover:underline flex items-center gap-1 mt-1"
                    >
                      {approveHash.slice(0, 6)}...{approveHash.slice(-4)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="border-b border-a5-b mx-4" />

            {/* Step 2: Create Order */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-full ring-3 flex items-center justify-center text-sm font-medium ${
                    isCreateSuccess
                      ? "text-green"
                      : currentStep === "create"
                        ? "text-primary-t"
                        : "text-secondary-t ring-a10-b"
                  }`}
                >
                  {isCreatePending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isCreateSuccess ? (
                    <CheckIcon className="h-4 w-4" />
                  ) : (
                    "2"
                  )}
                </div>
                <div>
                  <div className="font-medium text-sm">Create Limit Order</div>
                  <div className="text-xs text-secondary-t rounded-full border px-2 py-1 text-center border-a10-b mt-1">
                    {depositAmount} USDS at {maxPrice} USDS/OHM
                  </div>
                  {isCreateSuccess && createHash && (
                    <a
                      href={`${blockExplorerTxBaseUrl}/${createHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue hover:underline flex items-center gap-1 mt-1"
                    >
                      {createHash.slice(0, 6)}...{createHash.slice(-4)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Button
              onClick={currentStep === "approve" ? handleApprove : handleCreateOrder}
              disabled={isApprovePending || isCreatePending}
              className="w-full"
              size="lg"
            >
              {isApprovePending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : isCreatePending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Order...
                </>
              ) : currentStep === "create" ? (
                "Create Order"
              ) : (
                "Approve USDS"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
