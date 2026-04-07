import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import type { Address } from "viem";
import { ContractName, getContractAddress } from "@/lib/contracts";
import CrossChainBridgeAbi from "@/abis/CrossChainBridge";
import { LAYER_ZERO_CHAIN_IDS } from "@/modules/ohm/utils/constants";
import { useTransactionToast, type TransactionToastConfig } from "../useTransactionToast";

export function useBridgeOhm() {
  const queryClient = useQueryClient();
  const queryKeyRef = useRef<readonly unknown[] | undefined>(undefined);
  const { address } = useAccount();

  const {
    data: hash,
    writeContract,
    isPending: isWritePending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError,
  } = useWaitForTransactionReceipt({
    hash,
    confirmations: 1,
  });

  useEffect(() => {
    if (isConfirmed && queryKeyRef.current) {
      queryClient.invalidateQueries({ queryKey: queryKeyRef.current });
      queryKeyRef.current = undefined;
    }
  }, [isConfirmed, queryClient]);

  const toastConfig: TransactionToastConfig = {
    pending: {
      title: "Bridging OHM...",
      description: "Please wait while your bridge transaction is confirmed.",
    },
    success: {
      title: "Bridge transaction submitted!",
      description: "Your OHM is being bridged. It may take a few minutes to arrive.",
    },
    error: {
      title: "Bridge transaction failed",
      description: "There was an error bridging OHM. Please try again.",
      userRejected: {
        title: "Transaction cancelled",
        description: "You cancelled the bridge transaction.",
      },
      insufficientFunds: {
        title: "Insufficient funds",
        description: "You don't have enough native token for gas + bridge fees.",
      },
    },
  };

  const { reset: resetToast } = useTransactionToast({
    hash,
    isWritePending,
    isConfirmed,
    writeError,
    confirmError,
    config: toastConfig,
  });

  const bridge = ({
    sourceChainId,
    destinationChainId,
    recipientAddress,
    amount,
    nativeFee,
    queryKey,
  }: {
    sourceChainId: number;
    destinationChainId: number;
    recipientAddress: Address;
    amount: bigint;
    nativeFee: bigint;
    queryKey?: readonly unknown[];
  }) => {
    const bridgeAddress = getContractAddress(ContractName.CROSS_CHAIN_BRIDGE, sourceChainId);
    const layerZeroChainId = LAYER_ZERO_CHAIN_IDS[destinationChainId];

    if (!address || !bridgeAddress || !layerZeroChainId) return;

    resetWrite();
    resetToast();

    if (queryKey) {
      queryKeyRef.current = queryKey;
    }

    writeContract({
      address: bridgeAddress,
      abi: CrossChainBridgeAbi,
      functionName: "sendOhm",
      args: [layerZeroChainId, recipientAddress, amount],
      value: nativeFee,
      chainId: sourceChainId,
    });
  };

  const reset = () => {
    resetWrite();
    resetToast();
  };

  const isPending = isWritePending || isConfirming;
  const isSuccess = isConfirmed;
  const error = writeError || confirmError;

  return {
    bridge,
    isPending,
    isSuccess,
    error,
    hash,
    reset,
    isWritePending,
    isConfirming,
  };
}
