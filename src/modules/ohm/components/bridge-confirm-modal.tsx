import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { CheckIcon, Loader2, ExternalLink, Info } from "lucide-react";
import { parseUnits } from "viem";
import type { Address } from "viem";
import { useAccount } from "wagmi";
import { trackBridgeOhm } from "@/lib/analytics.ts";
import { ChainIcon } from "@/components/chain-icon.tsx";
import { useTokenAllowance } from "@/lib/hooks/useTokenAllowance.tsx";
import { useTokenApproval } from "@/lib/hooks/useTokenApproval.tsx";
import { useBridgeOhm } from "@/lib/hooks/bridge/useBridgeOhm.ts";
import { ContractName, getContractAddress } from "@/lib/contracts.ts";
import { TokenName, getTokenAddress } from "@/lib/tokens.ts";
import { getBlockExplorerTxUrl } from "@/lib/helpers.ts";
import { getBridgeChain } from "../utils/constants.ts";
import { Link } from "react-router-dom";

interface BridgeConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceChainId: number;
  destinationChainId: number;
  amount: string;
  recipientAddress: Address;
  nativeFee: bigint;
}

export function BridgeConfirmModal({
  isOpen,
  onClose,
  sourceChainId,
  destinationChainId,
  amount,
  recipientAddress,
  nativeFee,
}: BridgeConfirmModalProps) {
  const { address } = useAccount();

  const sourceChain = getBridgeChain(sourceChainId);
  const destChain = getBridgeChain(destinationChainId);

  const amountBigInt = (() => {
    try {
      return parseUnits(amount || "0", 9);
    } catch {
      return 0n;
    }
  })();

  // Approval
  const ohmAddress = getTokenAddress(TokenName.OHM, sourceChainId);
  const minterAddress = getContractAddress(ContractName.CROSS_CHAIN_MINTER, sourceChainId);
  const { allowance, queryKey } = useTokenAllowance(ohmAddress!, address, minterAddress);
  const hasSufficientAllowance =
    allowance != null && amountBigInt > 0n && allowance >= amountBigInt;

  const {
    approve,
    isPending: isApproving,
    isSuccess: approvalSuccess,
    hash: approvalHash,
  } = useTokenApproval();

  // Bridge
  const {
    bridge,
    isPending: isBridging,
    isSuccess: bridgeSuccess,
    hash: bridgeHash,
  } = useBridgeOhm();

  useEffect(() => {
    if (!bridgeSuccess) return;
    trackBridgeOhm({
      amount,
      srcChain: sourceChain?.name ?? String(sourceChainId),
      dstChain: destChain?.name ?? String(destinationChainId),
      txHash: bridgeHash,
    });
  }, [bridgeSuccess]);

  const getCurrentStep = () => {
    if (bridgeSuccess) return 2;
    if (hasSufficientAllowance || approvalSuccess) return 2;
    return 1;
  };

  const currentStep = getCurrentStep();

  const formatTxHash = (hash?: `0x${string}`) => {
    if (!hash) return "";
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  const handleApprove = () => {
    if (!ohmAddress || !minterAddress) return;
    approve({
      tokenAddress: ohmAddress,
      spender: minterAddress,
      amount: amountBigInt,
      queryKey,
    });
  };

  const handleBridge = () => {
    bridge({
      sourceChainId,
      destinationChainId,
      recipientAddress,
      amount: amountBigInt,
      nativeFee,
      queryKey,
    });
  };

  const steps = [
    {
      number: 1,
      title: "Approve OHM for Bridging",
      isActive: currentStep === 1,
      isCompleted: currentStep > 1,
      isLoading: currentStep === 1 && isApproving,
      hash: approvalSuccess ? approvalHash : undefined,
    },
    {
      number: 2,
      title: "Bridge OHM",
      badges: [
        { label: `-${amount} OHM (${sourceChain?.name})` },
        { label: `+${amount} OHM (${destChain?.name})` },
      ],
      isActive: currentStep === 2,
      isCompleted: bridgeSuccess,
      isLoading: currentStep === 2 && isBridging,
      hash: bridgeSuccess ? bridgeHash : undefined,
    },
  ];

  // Success state
  if (bridgeSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full sm:max-w-md mx-auto p-6 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckIcon className="h-8 w-8 text-green" />
            </div>
            <DialogTitle className="text-xl font-semibold mb-2">Bridge submitted!</DialogTitle>
            <p className="text-sm text-secondary-t mb-6">
              Your OHM is being bridged from {sourceChain?.name} to {destChain?.name}. It may take a
              few minutes to arrive.
            </p>
          </div>

          <div className="bg-surface-a3 border border-a3-b rounded-3xl">
            {steps.map((step, index) => (
              <div key={step.number}>
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-green/20 flex items-center justify-center">
                      <CheckIcon className="h-4 w-4 text-green" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{step.title}</div>
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
                    </div>
                  </div>
                  {step.hash && (
                    <Link
                      target="_blank"
                      to={getBlockExplorerTxUrl(sourceChainId, step.hash)}
                      className="flex items-center gap-1 text-sm text-blue hover:text-blue-800"
                    >
                      {formatTxHash(step.hash)}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
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
      <DialogContent className="w-full sm:max-w-md mx-auto p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 text-center">
          <DialogTitle className="text-xl">Bridge OHM</DialogTitle>
          <p className="text-sm text-secondary-t font-light">
            Transaction {currentStep}/2. Proceed with your wallet.
          </p>
        </DialogHeader>

        <div className="px-6 pb-6">
          {/* Chain Summary */}
          <div className="flex items-center justify-center gap-3 mb-4">
            {sourceChain && <ChainIcon chainId={sourceChain.chainId} size={24} />}
            <span className="text-sm text-secondary-t">{sourceChain?.name}</span>
            <span className="text-secondary-t">→</span>
            {destChain && <ChainIcon chainId={destChain.chainId} size={24} />}
            <span className="text-sm text-secondary-t">{destChain?.name}</span>
          </div>

          <div className="bg-surface-a3 border border-a3-b rounded-3xl">
            {steps.map((step, index) => (
              <div key={step.number}>
                <div className="flex items-center justify-between p-4">
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
                          to={getBlockExplorerTxUrl(sourceChainId, step.hash)}
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
          {currentStep === 2 && isBridging && (
            <div className="mt-4 flex items-start gap-2 bg-blue/10 border border-blue/20 rounded-xl p-3">
              <Info className="w-4 h-4 text-blue mt-0.5 shrink-0" />
              <p className="text-sm text-primary-t">
                Please don't close this modal until all wallet transactions are confirmed.
              </p>
            </div>
          )}

          <div className="mt-6">
            <Button
              onClick={currentStep === 1 ? handleApprove : handleBridge}
              disabled={isApproving || isBridging}
              className="w-full"
            >
              {isApproving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confirming Approval In Your Wallet
                </>
              ) : isBridging ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confirming Bridge In Your Wallet
                </>
              ) : currentStep === 2 ? (
                "Bridge OHM"
              ) : (
                "Approve OHM for Bridging"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
