import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useChainId,
} from "wagmi";
import type { Address } from "viem";
import { useTransactionToast, type TransactionToastConfig } from "@/lib/hooks/useTransactionToast";
import { useReceiptTokenManager } from "./useReceiptTokenManager";
import ReceiptTokenManagerABI from "@/abis/ReceiptTokenManager";

export function useFlexibleReceiptTokenAllowance(
  tokenId: bigint | undefined,
  ownerAddress: Address | undefined,
  targetContractAddress: Address | undefined,
) {
  const { receiptTokenManagerAddress } = useReceiptTokenManager();

  const {
    data: allowance,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: receiptTokenManagerAddress,
    abi: ReceiptTokenManagerABI,
    functionName: "allowance",
    args:
      ownerAddress && targetContractAddress && tokenId !== undefined
        ? [ownerAddress, targetContractAddress, tokenId]
        : undefined,
    query: {
      enabled: !!(
        receiptTokenManagerAddress &&
        ownerAddress &&
        targetContractAddress &&
        tokenId !== undefined
      ),
    },
  });

  return {
    allowance: allowance as bigint | undefined,
    isLoading,
    error,
    refetch,
  };
}

export function useFlexibleApproveReceiptToken(targetContractAddress: Address | undefined) {
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

  // Toast configuration for approval transactions
  const toastConfig: TransactionToastConfig = {
    pending: {
      title: "Approving receipt tokens...",
      description: "Please wait while your approval is processed.",
    },
    success: {
      title: "Approval successful!",
      description: "Receipt tokens have been approved successfully.",
    },
    error: {
      title: "Approval failed",
      description: "There was an error approving your receipt tokens. Please try again.",
      userRejected: {
        title: "Approval cancelled",
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

  // Invalidate allowance queries when approval succeeds
  useEffect(() => {
    if (isConfirmed && address && chainId && receiptTokenManagerAddress) {
      // Invalidate all allowance queries for this receipt token manager
      queryClient.invalidateQueries({
        queryKey: [
          "readContract",
          {
            address: receiptTokenManagerAddress,
            functionName: "allowance",
          },
        ],
      });
    }
  }, [isConfirmed, address, chainId, receiptTokenManagerAddress, queryClient]);

  const approveReceiptToken = ({ tokenId, amount }: { tokenId: bigint; amount: bigint }) => {
    if (!receiptTokenManagerAddress || !targetContractAddress) {
      throw new Error("Contract addresses not available");
    }

    // Reset both Wagmi state and toast state for new transaction
    resetWrite();
    resetToast();

    writeContract({
      address: receiptTokenManagerAddress,
      abi: ReceiptTokenManagerABI,
      functionName: "approve",
      args: [targetContractAddress, tokenId, amount],
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
    approveReceiptToken,
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
