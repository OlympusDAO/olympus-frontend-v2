import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { formatUnits, type Address } from "viem";
import { ContractName, getContractAddress } from "@/lib/contracts";
import { TokenName, getTokenAddress } from "@/lib/tokens";
import LZCrossChainBridgeAbi from "@/abis/LZCrossChainBridge";
import { chainIdToEid } from "@/modules/ohm/utils/constants";
import { addPendingBridgeTx } from "./usePendingBridgeTxs";
import { useTransactionToast, type TransactionToastConfig } from "../useTransactionToast";

export function useBridgeOhm() {
  const queryClient = useQueryClient();
  const queryKeyRef = useRef<readonly unknown[] | undefined>(undefined);
  // Source-chain OHM address whose balance should refresh once the burn confirms.
  const ohmAddressRef = useRef<Address | undefined>(undefined);
  // Transfer details captured at send time, used to record an optimistic history entry.
  const pendingRef = useRef<
    { sourceChainId: number; destinationChainId: number; amount: bigint } | undefined
  >(undefined);
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
    if (!isConfirmed) return;

    // Invalidate the allowance query passed in by the caller.
    if (queryKeyRef.current) {
      queryClient.invalidateQueries({ queryKey: queryKeyRef.current });
      queryKeyRef.current = undefined;
    }

    // Refresh the source-chain OHM balance (burned on send) so the UI updates.
    const ohmAddress = ohmAddressRef.current;
    if (ohmAddress) {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) &&
            key.some(
              (k) =>
                typeof k === "object" &&
                k !== null &&
                "functionName" in k &&
                (k as { functionName?: string }).functionName === "balanceOf" &&
                "address" in k &&
                (k as { address?: string }).address === ohmAddress,
            )
          );
        },
      });
    }

    // Record an optimistic history entry so the transfer shows immediately, before
    // LayerZero Scan indexes it.
    const p = pendingRef.current;
    if (p && hash && address) {
      addPendingBridgeTx({
        srcChainId: p.sourceChainId,
        dstChainId: p.destinationChainId,
        amount: formatUnits(p.amount, 9),
        srcTxHash: hash,
        timestamp: new Date().toISOString(),
        address,
      });
      pendingRef.current = undefined;
    }

    // Refresh bridge history so the new transfer appears.
    queryClient.invalidateQueries({ queryKey: ["bridgeHistory", address] });
  }, [isConfirmed, queryClient, address, hash]);

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
    const bridgeAddress = getContractAddress(ContractName.LZ_CROSS_CHAIN_BRIDGE, sourceChainId);
    const dstEid = chainIdToEid(destinationChainId);

    if (!address || !bridgeAddress || !dstEid) return;

    resetWrite();
    resetToast();

    if (queryKey) {
      queryKeyRef.current = queryKey;
    }
    ohmAddressRef.current = getTokenAddress(TokenName.OHM, sourceChainId);
    pendingRef.current = { sourceChainId, destinationChainId, amount };

    writeContract({
      address: bridgeAddress,
      abi: LZCrossChainBridgeAbi,
      functionName: "sendOhm",
      args: [dstEid, recipientAddress, amount],
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
