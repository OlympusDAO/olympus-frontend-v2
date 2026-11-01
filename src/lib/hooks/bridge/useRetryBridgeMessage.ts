import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useChainId, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import CCIPCrossChainBridgeAbi from "@/abis/CCIPCrossChainBridge";
import { ContractName, getContractAddress } from "@/lib/contracts";
import { useTransactionToast, type TransactionToastConfig } from "../useTransactionToast";
import type { BridgeHistoryItem } from "./useBridgeHistory";

const toastConfig: TransactionToastConfig = {
  pending: { title: "Retrying delivery...", description: "Please wait for confirmation." },
  success: { title: "Delivery retried", description: "Your OHM has been delivered." },
  error: {
    title: "Retry failed",
    description: "The delivery couldn't be retried. Please try again.",
    userRejected: { title: "Retry cancelled", description: "You cancelled the retry." },
  },
};

/**
 * Re-runs a delivery the destination bridge stored as failed. Anyone can call it, and the OHM goes
 * to the original recipient whoever does.
 */
export function useRetryBridgeMessage() {
  const queryClient = useQueryClient();
  const walletChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { data: hash, writeContract, isPending: isWritePending, error } = useWriteContract();
  const [retryChain, setRetryChain] = useState<number>();
  const {
    isLoading: isConfirming,
    isSuccess,
    error: confirmError,
  } = useWaitForTransactionReceipt({ hash, chainId: retryChain });

  useTransactionToast({
    hash,
    isWritePending,
    isConfirmed: isSuccess,
    writeError: error,
    confirmError,
    config: toastConfig,
  });

  useEffect(() => {
    if (isSuccess) queryClient.invalidateQueries({ queryKey: ["bridgeHistory", "ccip"] });
  }, [isSuccess, queryClient]);

  const retry = async ({ dstChainId, messageId }: BridgeHistoryItem) => {
    const bridge = getContractAddress(ContractName.CCIP_BRIDGE, dstChainId);
    if (!bridge || !messageId) return;

    if (walletChainId !== dstChainId) {
      try {
        await switchChainAsync({ chainId: dstChainId });
      } catch {
        return;
      }
    }

    setRetryChain(dstChainId);
    writeContract({
      address: bridge,
      abi: CCIPCrossChainBridgeAbi,
      functionName: "retryFailedMessage",
      args: [messageId],
      chainId: dstChainId,
    });
  };

  return { retry, isPending: isWritePending || isConfirming, isSuccess, error };
}
