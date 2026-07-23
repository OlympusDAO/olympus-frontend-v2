import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useChainId,
  usePublicClient,
} from "wagmi";
import { ContractName, getContractAddress } from "@/lib/contracts";
import WsOHMAbi from "@/abis/WsOHM";
import { useTransactionToast, type TransactionToastConfig } from "./useTransactionToast";

/**
 * Unwrap wsOHM → sOHM v1 via the legacy wsOHM contract. No approval is needed (the
 * contract burns the caller's own wsOHM). The resulting sOHM v1 can then be unstaked to
 * OHM v1 and migrated. wsOHM is 18 decimals; the returned sOHM v1 is 9 decimals and
 * scaled by the gOHM index (not 1:1).
 */
export function useUnwrapWsohm() {
  const queryClient = useQueryClient();
  const queryKeyRef = useRef<readonly unknown[] | undefined>(undefined);
  // Guards the async gas-estimation window before writeContract, during which
  // isWritePending is still false — without it a double-click submits twice.
  const isSubmittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();

  const wsohmAddress = getContractAddress(ContractName.WSOHM, chainId);

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
  } = useWaitForTransactionReceipt({ hash, confirmations: 1 });

  useEffect(() => {
    if (!isConfirmed) return;

    if (queryKeyRef.current) {
      queryClient.invalidateQueries({ queryKey: queryKeyRef.current });
      queryKeyRef.current = undefined;
    }

    // Refetch all on-chain reads + the Balances-page batched balance queries so the new
    // wsOHM / sOHM v1 balances show immediately.
    queryClient.invalidateQueries({ queryKey: ["readContract"] });
    queryClient.invalidateQueries({ queryKey: ["readContracts"] });
    queryClient.invalidateQueries({ queryKey: ["allTokenBalances"] });
    queryClient.invalidateQueries({ queryKey: ["multiChainBalance"] });
  }, [isConfirmed, queryClient]);

  const toastConfig: TransactionToastConfig = {
    pending: {
      title: "Unwrapping wsOHM...",
      description: "Please wait while your transaction is confirmed.",
    },
    success: {
      title: "Unwrapped to sOHM v1",
      description: "Your wsOHM has been unwrapped to sOHM v1. Next, unstake it to OHM v1.",
    },
    error: {
      title: "Unwrap failed",
      description: "There was an error unwrapping your wsOHM. Please try again.",
      userRejected: {
        title: "Transaction cancelled",
        description: "You cancelled the unwrap transaction.",
      },
      insufficientFunds: {
        title: "Insufficient funds",
        description: "You don't have enough ETH for gas fees.",
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

  const unwrap = async ({
    amount,
    queryKey,
  }: {
    amount: bigint;
    queryKey?: readonly unknown[];
  }) => {
    if (!address || !wsohmAddress) return;
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      resetWrite();
      resetToast();

      if (queryKey) queryKeyRef.current = queryKey;

      const args = [amount] as const;

      let gas: bigint | undefined;
      try {
        if (publicClient) {
          const estimate = await publicClient.estimateContractGas({
            address: wsohmAddress,
            abi: WsOHMAbi,
            functionName: "unwrap",
            args,
            account: address,
          });
          gas = (estimate * 3n) / 2n;
        }
      } catch {
        // Fall back to the wallet's own estimation.
      }

      writeContract({
        address: wsohmAddress,
        abi: WsOHMAbi,
        functionName: "unwrap",
        args,
        gas,
      });
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    resetWrite();
    resetToast();
  };

  return {
    unwrap,
    isPending: isSubmitting || isWritePending || isConfirming,
    isSuccess: isConfirmed,
    error: writeError || confirmError,
    hash,
    reset,
    isWritePending,
    isConfirming,
  };
}
