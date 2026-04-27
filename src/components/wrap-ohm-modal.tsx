import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckIcon, Loader2, ExternalLink, Info } from "lucide-react";
import { parseUnits, parseEther } from "viem";
import { useAccount, useChainId } from "wagmi";
import { trackWrapOhm, trackUnwrapGohm } from "@/lib/analytics";
import { useTokenAllowance } from "@/lib/hooks/useTokenAllowance";
import { useTokenApproval } from "@/lib/hooks/useTokenApproval";
import { useWrapOhm } from "@/lib/hooks/useWrapOhm";
import { useUnwrapGohm } from "@/lib/hooks/useUnwrapGohm";
import { ContractName, getContractAddress } from "@/lib/contracts";
import { TokenName, getTokenAddress } from "@/lib/tokens";
import { Link } from "react-router-dom";
import { blockExplorerTxBaseUrl } from "@/lib/helpers";

interface WrapOhmModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "wrap" | "unwrap";
  inputAmount: string;
  outputAmount: string;
}

export function WrapOhmModal({
  isOpen,
  onClose,
  mode,
  inputAmount,
  outputAmount,
}: WrapOhmModalProps) {
  const { address } = useAccount();
  const chainId = useChainId();

  const stakingAddress = getContractAddress(ContractName.STAKING, chainId);
  const tokenAddress =
    mode === "wrap"
      ? getTokenAddress(TokenName.OHM, chainId)
      : getTokenAddress(TokenName.GOHM, chainId);

  // Parse amount with correct decimals
  const amountBigInt = (() => {
    try {
      return mode === "wrap" ? parseUnits(inputAmount || "0", 9) : parseEther(inputAmount || "0");
    } catch {
      return 0n;
    }
  })();

  // Check allowance
  const { allowance, queryKey } = useTokenAllowance(tokenAddress!, address, stakingAddress);

  const hasSufficientAllowance = allowance != null && allowance >= amountBigInt;

  // Approval hook
  const {
    approve,
    isPending: isApproving,
    isSuccess: approvalSuccess,
    hash: approvalHash,
  } = useTokenApproval();

  // Wrap hook
  const { wrap, isPending: isWrapping, isSuccess: wrapSuccess, hash: wrapHash } = useWrapOhm();

  // Unwrap hook
  const {
    unwrap,
    isPending: isUnwrapping,
    isSuccess: unwrapSuccess,
    hash: unwrapHash,
  } = useUnwrapGohm();

  const isExecuting = mode === "wrap" ? isWrapping : isUnwrapping;
  const executeSuccess = mode === "wrap" ? wrapSuccess : unwrapSuccess;
  const executeHash = mode === "wrap" ? wrapHash : unwrapHash;

  useEffect(() => {
    if (!executeSuccess) return;
    if (mode === "wrap") {
      trackWrapOhm({ amount: inputAmount, txHash: executeHash });
    } else {
      trackUnwrapGohm({ amount: inputAmount, txHash: executeHash });
    }
  }, [executeSuccess]);

  // Step logic
  const getCurrentStep = () => {
    if (executeSuccess) return 2;
    if (hasSufficientAllowance || approvalSuccess) return 2;
    return 1;
  };

  const currentStep = getCurrentStep();

  const formatTxHash = (hash?: `0x${string}`) => {
    if (!hash) return "";
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  const capDecimals = (value: string, maxDecimals = 4) => {
    const [integer, decimal] = value.split(".");
    if (!decimal) return value;
    return `${integer}.${decimal.slice(0, maxDecimals)}`;
  };

  const handleApprove = () => {
    if (!tokenAddress || !stakingAddress) return;
    approve({
      tokenAddress,
      spender: stakingAddress,
      amount: amountBigInt,
      queryKey,
    });
  };

  const handleExecute = () => {
    if (!address) return;
    if (mode === "wrap") {
      wrap({ amount: amountBigInt, queryKey });
    } else {
      unwrap({ amount: amountBigInt, queryKey });
    }
  };

  const inputSymbol = mode === "wrap" ? "OHM" : "gOHM";
  const outputSymbol = mode === "wrap" ? "gOHM" : "OHM";
  const approveLabel = mode === "wrap" ? "Approve Wrapping" : "Approve Unwrapping";
  const executeLabel = mode === "wrap" ? "Wrap OHM to gOHM" : "Unwrap gOHM to OHM";
  const modalTitle = mode === "wrap" ? "Wrap OHM" : "Unwrap gOHM";

  const steps = [
    {
      number: 1,
      title: approveLabel,
      isActive: currentStep === 1,
      isCompleted: currentStep > 1,
      isLoading: currentStep === 1 && isApproving,
      hash: approvalSuccess ? approvalHash : undefined,
    },
    {
      number: 2,
      title: executeLabel,
      detail: `-${inputAmount} ${inputSymbol}    +${outputAmount} ${outputSymbol}`,
      badges: [
        { label: `-${capDecimals(inputAmount)} ${inputSymbol}` },
        { label: `+${capDecimals(outputAmount)} ${outputSymbol}` },
      ],
      isActive: currentStep === 2,
      isCompleted: executeSuccess,
      isLoading: currentStep === 2 && isExecuting,
      hash: executeSuccess ? executeHash : undefined,
    },
  ];

  // Success state
  if (executeSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full sm:max-w-md mx-auto p-6 gap-6 ">
          <div className="text-center">
            <div className="w-16 h-16 bg-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckIcon className="h-8 w-8 text-green" />
            </div>
            <DialogTitle className="text-xl font-semibold mb-2">Congrats, all done!</DialogTitle>
            <p className="text-sm text-secondary-t mb-6">Your transactions have been executed.</p>
          </div>

          <div className="bg-surface-a3 border border-a3-b rounded-3xl">
            {steps.map((step, index) => (
              <div key={step.number}>
                <div className="flex items-center gap-3 p-4">
                  <div className="w-6 h-6 rounded-full bg-green/20 flex items-center justify-center shrink-0">
                    <CheckIcon className="h-4 w-4 text-green" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{step.title}</div>
                    {step.badges && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {step.badges.map((badge) => (
                          <span
                            key={badge.label}
                            className="text-xs text-secondary-t rounded-full border px-2 py-0.5 border-a10-b"
                          >
                            {badge.label}
                          </span>
                        ))}
                      </div>
                    )}
                    {step.hash && (
                      <Link
                        target="_blank"
                        to={`${blockExplorerTxBaseUrl}${step.hash}`}
                        className="flex items-center gap-1 text-xs text-blue hover:text-blue-800 mt-1"
                      >
                        {formatTxHash(step.hash)}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
                {index < steps.length - 1 && <div className="border-b border-a5-b mx-4" />}
              </div>
            ))}
          </div>

          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  // Steps view
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full sm:max-w-md mx-auto p-0 gap-0 !rounded-3xl">
        <DialogHeader className="px-6 pt-6 pb-2 text-center !gap-6">
          <DialogTitle className="text-[20px]/[24px] font-semibold text-primary-t">
            {modalTitle}
          </DialogTitle>
          <p className="text-xs/4 font-normal text-secondary-t">
            Transaction {currentStep}/2. Proceed with your wallet.
          </p>
        </DialogHeader>

        <div className="px-6 pb-6">
          <div className="bg-surface-a3 border border-a3-b rounded-3xl">
            {steps.map((step, index) => (
              <div key={step.number}>
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs font-medium ${
                        step.isCompleted
                          ? "text-green border-green"
                          : step.isActive
                            ? "text-primary-t border-primary-t"
                            : "text-secondary-t border-a10-b"
                      }`}
                    >
                      {step.isLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : step.isCompleted ? (
                        <CheckIcon className="h-3 w-3" />
                      ) : (
                        step.number
                      )}
                    </div>
                    <div>
                      <div className="text-sm/5 font-semibold text-primary-t">{step.title}</div>
                      {step.badges && (
                        <div className="flex gap-1 mt-1">
                          {step.badges.map((badge) => (
                            <span
                              key={badge.label}
                              className="text-xs text-secondary-t rounded-full border px-2 py-0.5 border-a10-b"
                            >
                              {badge.label}
                            </span>
                          ))}
                        </div>
                      )}
                      {step.isCompleted && step.hash && (
                        <Link
                          target="_blank"
                          to={`${blockExplorerTxBaseUrl}${step.hash}`}
                          className="flex items-center gap-1 text-xs text-blue hover:text-blue-800 mt-1"
                        >
                          {formatTxHash(step.hash)}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
                {index < steps.length - 1 && <div className="border-b border-a5-b mx-4" />}
              </div>
            ))}
          </div>

          {/* Warning during execution */}
          {currentStep === 2 && isExecuting && (
            <div className="mt-4 flex items-start gap-2 bg-blue/10 border border-blue/20 rounded-xl p-3">
              <Info className="w-4 h-4 text-blue mt-0.5 shrink-0" />
              <p className="text-sm text-primary-t">
                Please don't close this modal until all wallet transactions are confirmed.
              </p>
            </div>
          )}

          <div className="mt-6">
            <Button
              onClick={currentStep === 1 ? handleApprove : handleExecute}
              disabled={isApproving || isExecuting}
              className="w-full"
            >
              {isApproving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confirming Approval In Your Wallet
                </>
              ) : isExecuting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confirming {mode === "wrap" ? "Wrapping" : "Unwrapping"} In Your Wallet
                </>
              ) : currentStep === 2 ? (
                executeLabel
              ) : (
                approveLabel
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
