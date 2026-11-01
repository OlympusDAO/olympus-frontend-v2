import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useChainId, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import CCIPCrossChainBridgeAbi from "@/abis/CCIPCrossChainBridge";
import { ContractName, getContractAddress } from "@/lib/contracts";
import type { BridgeHistoryItem } from "./useBridgeHistory";

/**
 * Re-runs a delivery the destination bridge stored as failed. Anyone can call it, and the OHM goes
 * to the original recipient whoever does.
 */
export function useRetryBridgeMessage() {
  const queryClient = useQueryClient();
  const walletChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { data: hash, writeContract, isPending: isWritePending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

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
