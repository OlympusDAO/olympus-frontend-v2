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
import OlympusStakingV1Abi from "@/abis/OlympusStakingV1";
import { useTransactionToast, type TransactionToastConfig } from "./useTransactionToast";

/**
 * Unstake sOHM v1 → OHM v1 via the legacy Olympus v1 staking contract (1:1). Requires a
 * prior exact-amount sOHM v1 approval to the staking contract. This is the prerequisite
 * step for sOHM v1 holders who want to migrate (the migrator only burns OHM v1).
 */
export function useUnstakeV1() {
  const queryClient = useQueryClient();
  const queryKeyRef = useRef<readonly unknown[] | undefined>(undefined);
  // Guards the async gas-estimation window before writeContract, during which
  // isWritePending is still false — without it a double-click submits twice.
  const isSubmittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();

  const stakingV1 = getContractAddress(ContractName.STAKING_V1, chainId);

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
    // sOHM v1 / OHM v1 balances show immediately.
    queryClient.invalidateQueries({ queryKey: ["readContract"] });
    queryClient.invalidateQueries({ queryKey: ["readContracts"] });
    queryClient.invalidateQueries({ queryKey: ["allTokenBalances"] });
    queryClient.invalidateQueries({ queryKey: ["multiChainBalance"] });
  }, [isConfirmed, queryClient]);

  const toastConfig: TransactionToastConfig = {
    pending: {
      title: "Unstaking sOHM v1...",
      description: "Please wait while your transaction is confirmed.",
    },
    success: {
      title: "Unstaked to OHM v1",
      description: "Your sOHM v1 has been unstaked to OHM v1. You can now migrate.",
    },
    error: {
      title: "Unstake failed",
      description: "There was an error unstaking your sOHM v1. Please try again.",
      userRejected: {
        title: "Transaction cancelled",
        description: "You cancelled the unstake transaction.",
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

  const unstake = async ({
    amount,
    queryKey,
  }: {
    amount: bigint;
    queryKey?: readonly unknown[];
  }) => {
    if (!address || !stakingV1) return;
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      resetWrite();
      resetToast();

      if (queryKey) queryKeyRef.current = queryKey;

      // unstake(_amount, _trigger=false) — trigger=false skips the (gas-heavy) rebase.
      const args = [amount, false] as const;

      let gas: bigint | undefined;
      try {
        if (publicClient) {
          const estimate = await publicClient.estimateContractGas({
            address: stakingV1,
            abi: OlympusStakingV1Abi,
            functionName: "unstake",
            args,
            account: address,
          });
          gas = (estimate * 3n) / 2n;
        }
      } catch {
        // Fall back to the wallet's own estimation.
      }

      writeContract({
        address: stakingV1,
        abi: OlympusStakingV1Abi,
        functionName: "unstake",
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
    unstake,
    isPending: isSubmitting || isWritePending || isConfirming,
    isSuccess: isConfirmed,
    error: writeError || confirmError,
    hash,
    reset,
    isWritePending,
    isConfirming,
  };
}
