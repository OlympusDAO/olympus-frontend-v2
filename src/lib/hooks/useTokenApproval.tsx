import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import type { Address } from "viem";
import { erc20Abi } from "viem";
import { useTransactionToast, TransactionToastConfig } from "./useTransactionToast";

export function useTokenApproval() {
  const queryClient = useQueryClient();
  const queryKeyRef = useRef<readonly unknown[] | undefined>(undefined);

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

  // Invalidate queries when transaction is confirmed (not just submitted)
  useEffect(() => {
    if (isConfirmed && queryKeyRef.current) {
      queryClient.invalidateQueries({ queryKey: queryKeyRef.current });
      queryKeyRef.current = undefined; // Clear after invalidating
    }
  }, [isConfirmed, queryClient]);

  // Toast configuration for approval transactions
  const toastConfig: TransactionToastConfig = {
    pending: {
      title: "Approving token...",
      description: "Please wait while your approval is confirmed.",
    },
    success: {
      title: "Token approval successful!",
      description: "You can now proceed with your transaction.",
    },
    error: {
      title: "Approval failed",
      description: "There was an error approving the token. Please try again.",
      userRejected: {
        title: "Approval cancelled",
        description: "You cancelled the approval request.",
      },
      insufficientFunds: {
        title: "Insufficient funds",
        description: "You don't have enough ETH for gas fees.",
      },
    },
  };

  // Handle toast notifications using the reusable hook
  const { reset: resetToast } = useTransactionToast({
    hash,
    isWritePending,
    isConfirmed,
    writeError,
    confirmError,
    config: toastConfig,
  });

  const approve = ({
    tokenAddress,
    spender,
    amount,
    queryKey,
  }: {
    tokenAddress: Address;
    spender: Address;
    amount: bigint;
    queryKey?: readonly unknown[];
  }) => {
    // Reset both Wagmi state and toast state for new transaction
    resetWrite();
    resetToast();

    // Store queryKey for invalidation after confirmation
    if (queryKey) {
      queryKeyRef.current = queryKey;
    }

    writeContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [spender, amount],
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
    approve,
    isPending,
    isSuccess,
    error,
    hash,
    reset,
    // Granular states for advanced use cases
    isWritePending,
    isConfirming,
    writeError,
    confirmError,
  };
}
