import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount, usePublicClient } from "wagmi";
import type { Abi, Address } from "viem";
import { useTransactionToast, type TransactionToastConfig } from "./useTransactionToast";

/**
 * Shared scaffold for single-transaction contract writes: write → wait for confirmation →
 * invalidate on-chain read queries → toast lifecycle. Gas is estimated at click-time with
 * a 50% buffer (policy-routed calls like the migrator's mint path are estimation-sensitive;
 * a stale/low wallet estimate can cause an out-of-gas revert), falling back to the
 * wallet's own estimation when the estimate call fails.
 */
export function useContractWriteFlow({
  address,
  abi,
  functionName,
  toastConfig,
}: {
  /** Target contract. Undefined (e.g. unsupported chain) makes `write` a no-op. */
  address?: Address;
  abi: Abi;
  functionName: string;
  toastConfig: TransactionToastConfig;
}) {
  const queryClient = useQueryClient();
  const queryKeyRef = useRef<readonly unknown[] | undefined>(undefined);
  // Guards the async gas-estimation window before writeContract, during which
  // isWritePending is still false — without it a double-click submits twice.
  const isSubmittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { address: account } = useAccount();
  const publicClient = usePublicClient();

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

    // Invalidate the allowance query passed in by the caller.
    if (queryKeyRef.current) {
      queryClient.invalidateQueries({ queryKey: queryKeyRef.current });
      queryKeyRef.current = undefined;
    }

    // Refetch every on-chain read (token balances, allowances, contract status — both
    // single reads and multicalls) plus the Balances-page batched balance queries, so the
    // UI reflects the new balances immediately.
    queryClient.invalidateQueries({ queryKey: ["readContract"] });
    queryClient.invalidateQueries({ queryKey: ["readContracts"] });
    queryClient.invalidateQueries({ queryKey: ["allTokenBalances"] });
    queryClient.invalidateQueries({ queryKey: ["multiChainBalance"] });
  }, [isConfirmed, queryClient]);

  const { reset: resetToast } = useTransactionToast({
    hash,
    isWritePending,
    isConfirmed,
    writeError,
    confirmError,
    config: toastConfig,
  });

  const write = async ({
    args,
    queryKey,
  }: {
    args: readonly unknown[];
    queryKey?: readonly unknown[];
  }) => {
    if (!account || !address) return;
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      resetWrite();
      resetToast();

      if (queryKey) queryKeyRef.current = queryKey;

      let gas: bigint | undefined;
      try {
        if (publicClient) {
          const estimate = await publicClient.estimateContractGas({
            address,
            abi,
            functionName,
            args,
            account,
          });
          gas = (estimate * 3n) / 2n;
        }
      } catch {
        // Estimation failed (e.g. allowance not yet confirmed) — fall back to the
        // wallet's own estimation so the error toast surfaces the revert.
      }

      writeContract({
        address,
        abi,
        functionName,
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
    write,
    isPending: isSubmitting || isWritePending || isConfirming,
    isSuccess: isConfirmed,
    error: writeError || confirmError,
    hash,
    reset,
    isWritePending,
    isConfirming,
  };
}
