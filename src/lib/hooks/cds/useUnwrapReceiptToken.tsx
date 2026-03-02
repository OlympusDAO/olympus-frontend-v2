import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from "wagmi";
import { useTransactionToast, type TransactionToastConfig } from "@/lib/hooks/useTransactionToast";
import { useReceiptTokenManager } from "./useReceiptTokenManager";
import ReceiptTokenManagerABI from "@/abis/ReceiptTokenManager";

interface UnwrapReceiptTokenParams {
  tokenId: bigint;
  amount: bigint;
  queryKey?: unknown[];
}

export const useUnwrapReceiptToken = () => {
  const { address } = useAccount();
  const chainId = useChainId();
  const queryClient = useQueryClient();
  const { receiptTokenManagerAddress } = useReceiptTokenManager();

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

  // Toast configuration for unwrap transactions
  const toastConfig: TransactionToastConfig = {
    pending: {
      title: "Unwrapping receipt tokens...",
      description: "Please wait while your tokens are being unwrapped.",
    },
    success: {
      title: "Tokens unwrapped successfully!",
      description: "Your wrapped ERC-20 tokens have been converted to ERC-6909 tokens.",
    },
    error: {
      title: "Unwrap failed",
      description: "There was an error unwrapping your tokens. Please try again.",
      userRejected: {
        title: "Unwrap cancelled",
        description: "You cancelled the transaction.",
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

  // Invalidate queries when unwrap succeeds
  useEffect(() => {
    if (isConfirmed && address && chainId && receiptTokenManagerAddress) {
      // Invalidate balance queries for receipt tokens
      queryClient.invalidateQueries({
        queryKey: [
          "readContract",
          {
            address: receiptTokenManagerAddress,
            functionName: "balanceOf",
          },
        ],
      });

      // Invalidate wrapped token balance queries (ERC-20)
      queryClient.invalidateQueries({
        queryKey: [
          "readContract",
          {
            functionName: "balanceOf",
          },
        ],
      });

      // Invalidate allowance queries
      queryClient.invalidateQueries({
        queryKey: [
          "readContract",
          {
            address: receiptTokenManagerAddress,
            functionName: "allowance",
          },
        ],
      });

      // Invalidate token balances queries
      queryClient.invalidateQueries({
        queryKey: ["tokenBalances"],
      });

      // Invalidate all read contracts queries
      queryClient.invalidateQueries({
        queryKey: ["readContracts"],
      });
    }
  }, [isConfirmed, address, chainId, receiptTokenManagerAddress, queryClient]);

  const unwrap = ({ tokenId, amount, queryKey }: UnwrapReceiptTokenParams) => {
    if (!receiptTokenManagerAddress) {
      throw new Error("Receipt token manager address not found");
    }

    // Reset both Wagmi state and toast state for new transaction
    resetWrite();
    resetToast();

    writeContract(
      {
        address: receiptTokenManagerAddress,
        abi: ReceiptTokenManagerABI,
        functionName: "unwrap",
        args: [tokenId, amount],
      },
      {
        onSuccess: () => {
          if (queryKey) {
            queryClient.invalidateQueries({ queryKey });
          }
        },
      },
    );
  };

  const reset = () => {
    resetWrite();
    resetToast();
  };

  const isPending = isWritePending || isConfirming;
  const isSuccess = isConfirmed;
  const error = writeError || confirmError;

  return {
    unwrap,
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
};
