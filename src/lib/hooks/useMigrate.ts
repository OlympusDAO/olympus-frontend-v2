import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useChainId,
  usePublicClient,
} from "wagmi";
import type { Hex } from "viem";
import { ContractName, getContractAddress } from "@/lib/contracts";
import V1MigratorAbi from "@/abis/V1Migrator";
import { useTransactionToast, type TransactionToastConfig } from "./useTransactionToast";

/**
 * Migrate OHM v1 → OHM v2 via the V1Migrator policy. The migrator `burnFrom`s OHM v1
 * (requires a prior exact-amount approval to the migrator) and mints OHM v2 to the user.
 */
export function useMigrate() {
  const queryClient = useQueryClient();
  const queryKeyRef = useRef<readonly unknown[] | undefined>(undefined);
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();

  const migrator = getContractAddress(ContractName.OHM_V1_MIGRATOR, chainId);

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

    // Invalidate the allowance query passed in by the modal.
    if (queryKeyRef.current) {
      queryClient.invalidateQueries({ queryKey: queryKeyRef.current });
      queryKeyRef.current = undefined;
    }

    // Refetch every on-chain read (token balances, allowances, migrator status — both
    // single reads and multicalls) plus the Balances-page batched balance queries, so the
    // UI reflects the new OHM v1/v2 balances and remaining allocation immediately.
    queryClient.invalidateQueries({ queryKey: ["readContract"] });
    queryClient.invalidateQueries({ queryKey: ["readContracts"] });
    queryClient.invalidateQueries({ queryKey: ["allTokenBalances"] });
    queryClient.invalidateQueries({ queryKey: ["multiChainBalance"] });
  }, [isConfirmed, queryClient]);

  const toastConfig: TransactionToastConfig = {
    pending: {
      title: "Migrating OHM v1...",
      description: "Please wait while your transaction is confirmed.",
    },
    success: {
      title: "Migration complete!",
      description: "Your OHM v1 has been migrated to OHM v2.",
    },
    error: {
      title: "Migration failed",
      description: "There was an error migrating your OHM v1. Please try again.",
      userRejected: {
        title: "Transaction cancelled",
        description: "You cancelled the migration transaction.",
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

  const migrate = async ({
    amount,
    proof,
    allocatedAmount,
    queryKey,
  }: {
    amount: bigint;
    proof: Hex[];
    allocatedAmount: bigint;
    queryKey?: readonly unknown[];
  }) => {
    if (!address || !migrator) return;

    resetWrite();
    resetToast();

    if (queryKey) queryKeyRef.current = queryKey;

    const args = [amount, proof, allocatedAmount] as const;

    // Estimate gas at click-time (allowance is set) and add a 50% buffer. The migrate
    // path mints OHM v2 through the Kernel/MINTR policy, so it is gas-heavier and more
    // estimation-sensitive than a plain transfer; without this, a stale/low wallet
    // estimate (e.g. from the pre-approval state) can cause an out-of-gas revert.
    let gas: bigint | undefined;
    try {
      if (publicClient) {
        const estimate = await publicClient.estimateContractGas({
          address: migrator,
          abi: V1MigratorAbi,
          functionName: "migrate",
          args,
          account: address,
        });
        gas = (estimate * 3n) / 2n;
      }
    } catch {
      // Estimation failed (e.g. allowance not yet confirmed) — fall back to the
      // wallet's own estimation so the existing error toast surfaces the revert.
    }

    // migrate(amount_, proof_, allocatedAmount_)
    writeContract({
      address: migrator,
      abi: V1MigratorAbi,
      functionName: "migrate",
      args,
      gas,
    });
  };

  const reset = () => {
    resetWrite();
    resetToast();
  };

  return {
    migrate,
    isPending: isWritePending || isConfirming,
    isSuccess: isConfirmed,
    error: writeError || confirmError,
    hash,
    reset,
    isWritePending,
    isConfirming,
  };
}
