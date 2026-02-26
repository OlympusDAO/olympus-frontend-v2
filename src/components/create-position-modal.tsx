import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckIcon, Loader2, ExternalLink } from "lucide-react";
import { parseEther } from "viem";
import { useAccount, useChainId } from "wagmi";
import { useTokenAllowance } from "@/lib/hooks/useTokenAllowance";
import { useTokenApproval } from "@/lib/hooks/useTokenApproval";
import { useBid } from "@/lib/hooks/cds/useBid";
import { useDepositManager } from "@/lib/hooks/cds/useDepositManager";
import { usePreviewBid } from "@/lib/hooks/cds/usePreviewBid";
import { getContractAddress, ContractName } from "@/lib/contracts";
import { getTokenAddress } from "@/lib/tokens";
import cdUSDSIcon from "@/assets/cdUSDS.png";
import { Link } from "react-router-dom";
import { blockExplorerTxBaseUrl } from "@/lib/helpers";
import { useReceiptTokenId, useReceiptTokenName } from "@/lib/hooks/cds/useReceiptToken";
import { trackDepositCreate } from "@/lib/analytics";
import { useEffect } from "react";

interface CreatePositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  depositAmount?: string;
  selectedTerm?: string;
  slippage?: string;
  wrapPosition?: boolean;
  isAuctionDisabled?: boolean;
}

export const CreatePositionModal: React.FC<CreatePositionModalProps> = ({
  isOpen,
  onClose,
  depositAmount = "456.45",
  selectedTerm = "3m",
  slippage = "1.0",
  wrapPosition = false,
  isAuctionDisabled = false,
}) => {
  const { address } = useAccount();
  const chainId = useChainId();

  // Get contract and token addresses for current network
  const tokenAddress = getTokenAddress("USDS", chainId);
  const auctioneerAddress = getContractAddress(
    ContractName.CONVERTIBLE_DEPOSIT_AUCTIONEER,
    chainId
  );
  const facilityAddress = getContractAddress(
    ContractName.CONVERTIBLE_DEPOSIT_FACILITY,
    chainId
  );

  // Get the DepositManager address from the ConvertibleDepositFacility
  const { depositManagerAddress } = useDepositManager(facilityAddress);

  // Parse the deposit amount to check allowance
  const depositAmountBigInt = parseEther(depositAmount);

  // Parse term to get period in months
  const periodMonths = parseInt(selectedTerm.replace("m", "")) || 1;

  // Get receipt token ID and name
  const { tokenId } = useReceiptTokenId(
    tokenAddress as `0x${string}` | undefined,
    periodMonths
  );
  const { tokenName } = useReceiptTokenName(tokenId);

  // Use dynamic token name with fallback (no loading state to avoid jerkiness)
  const displayTokenName = tokenName || `Receipt-${selectedTerm}`;

  // Get expected OHM output for slippage calculation
  const { ohmOut } = usePreviewBid({
    depositPeriod: periodMonths,
    bidAmount: depositAmount,
    enabled:
      !!auctioneerAddress && depositAmount !== "0" && depositAmount !== "",
  });

  // Helper function to calculate minimum OHM output based on slippage
  const calculateMinOhmOut = (
    expectedOhm: bigint,
    slippagePercent: string
  ): bigint => {
    if (!expectedOhm || expectedOhm === 0n) return 0n;

    const slippageFloat = parseFloat(slippagePercent);
    const slippageBasisPoints = BigInt(Math.round(slippageFloat * 100));
    const minOhm = (expectedOhm * (10000n - slippageBasisPoints)) / 10000n;
    return minOhm;
  };

  // Check current allowance (approval needs to go to DepositManager)
  const { allowance, queryKey } = useTokenAllowance(
    tokenAddress!,
    address,
    depositManagerAddress
  );

  // Check if user has sufficient allowance
  const hasSufficientAllowance = allowance && allowance >= depositAmountBigInt;

  // Approval hook
  const {
    approve,
    isPending: isApproving,
    isSuccess: approvalSuccess,
    hash: approvalHash,
  } = useTokenApproval();

  // Bid hook
  const {
    bid,
    isPending: isBidding,
    isSuccess: bidSuccess,
    hash: bidHash,
  } = useBid();

  useEffect(() => {
    if (bidSuccess) {
      trackDepositCreate({
        depositAmount,
        termMonths: periodMonths,
        txHash: bidHash,
      });
    }
  }, [bidSuccess, depositAmount, periodMonths, bidHash]);

  // Determine current step based on allowance and bid success
  const getCurrentStep = () => {
    if (bidSuccess) return 2;
    if (hasSufficientAllowance || approvalSuccess) return 2;
    return 1;
  };

  const currentStep = getCurrentStep();

  // Helper function to format transaction hash for display
  const formatTxHash = (hash?: `0x${string}`) => {
    if (!hash) return "";
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  // Handle approval
  const handleApprove = () => {
    if (!tokenAddress || !depositManagerAddress) return;

    approve({
      tokenAddress,
      spender: depositManagerAddress,
      amount: depositAmountBigInt,
      queryKey,
    });
  };

  // Handle bid
  const handleBid = () => {
    if (!tokenAddress || !auctioneerAddress || !address) return;

    // Calculate minimum OHM output based on slippage
    const minOhmOut = calculateMinOhmOut(ohmOut || 0n, slippage);

    bid({
      contractAddress: auctioneerAddress,
      depositPeriod: periodMonths,
      depositAmount: depositAmountBigInt,
      minOhmOut,
      wrapPosition: wrapPosition,
      wrapReceipt: false,
      queryKey,
      isAuctionDisabled,
    });
  };

  const steps = [
    {
      number: 1,
      title: "Approve USDS",
      isActive: currentStep === 1,
      isCompleted: currentStep > 1,
      isLoading: currentStep === 1 && isApproving,
      hash: approvalSuccess ? approvalHash : undefined,
    },
    {
      number: 2,
      title: `Deposit & Mint ${displayTokenName}`,
      detail: `${depositAmount} USDS → ${depositAmount} ${displayTokenName}`,
      icon: cdUSDSIcon,
      isActive: currentStep === 2,
      isCompleted: bidSuccess,
      isLoading: currentStep === 2 && isBidding,
      hash: bidSuccess ? bidHash : undefined,
    },
  ];

  // Show congratulations state when bid is successful
  if (bidSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full sm:max-w-md mx-auto p-6 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckIcon className="h-8 w-8 text-green" />
            </div>
            <DialogTitle className="text-xl font-semibold mb-2">
              Congrats, all done!
            </DialogTitle>
            <p className="text-sm text-gray-600 mb-6">
              Your transactions have been executed.
            </p>
          </div>

          <div className="space-y-3">
            {steps.map((step) => (
              <div
                key={step.number}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green/20 flex items-center justify-center">
                    <CheckIcon className="h-4 w-4 text-green" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{step.title}</div>
                    {step.detail && (
                      <div className="text-xs text-secondary-t">
                        {step.detail}
                      </div>
                    )}
                  </div>
                </div>
                {step.hash && (
                  <Link
                    target="_blank"
                    to={`${blockExplorerTxBaseUrl}/${step.hash}`}
                    className="flex items-center gap-1 text-sm text-blue hover:text-blue-800"
                  >
                    {formatTxHash(step.hash)}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
            ))}
          </div>

          <Button
            onClick={onClose}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white"
            size="lg"
          >
            Close
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full sm:max-w-md mx-auto p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 text-center">
          <DialogTitle className="text-xl">Create Position</DialogTitle>
          <p className="text-sm text-secondary-t font-light">
            Step {currentStep}/2. Proceed with your wallet.
          </p>
        </DialogHeader>

        <div className="px-6 pb-6">
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

          <div className="mt-6">
            <Button
              onClick={currentStep === 1 ? handleApprove : handleBid}
              disabled={isApproving || isBidding}
              className="w-full"
              size="lg"
            >
              {isApproving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : isBidding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting Transaction...
                </>
              ) : currentStep === 2 ? (
                "Deposit & Mint"
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
