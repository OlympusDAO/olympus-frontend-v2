import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from "wagmi";
import { useTransactionToast, type TransactionToastConfig } from "@/lib/hooks/useTransactionToast";
import { getContractAddress, ContractName } from "@/lib/contracts";
import { getTokenAddress, TokenName } from "@/lib/tokens";
import DepositRedemptionVaultABI from "@/abis/DepositRedemptionVault";

export function useBorrowAgainstRedemption() {
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const chainId = useChainId();

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

  // Toast configuration for borrow transactions
  const toastConfig: TransactionToastConfig = {
    pending: {
      title: "Submitting borrow...",
      description: "Please wait while your borrow transaction is processed.",
    },
    success: {
      title: "Borrow successful!",
      description: "You have successfully borrowed against your redemption.",
    },
    error: {
      title: "Borrow failed",
      description: "There was an error submitting your borrow. Please try again.",
      userRejected: {
        title: "Borrow cancelled",
        description: "You cancelled the transaction.",
      },
      insufficientFunds: {
        title: "Insufficient funds",
        description: "You don't have enough ETH for gas fees.",
      },
    },
  };

  // Handle toast notifications
  const { reset: resetToast } = useTransactionToast({
    hash,
    isWritePending,
    isConfirmed,
    writeError,
    confirmError,
    config: toastConfig,
  });

  // Invalidate queries when borrow succeeds
  useEffect(() => {
    if (isConfirmed && address && chainId) {
      const vaultAddress = getContractAddress(ContractName.DEPOSIT_REDEMPTION_VAULT, chainId);

      if (vaultAddress) {
        // Invalidate user redemptions
        queryClient.invalidateQueries({
          queryKey: [
            "readContract",
            {
              address: vaultAddress,
              functionName: "getUserRedemptions",
              args: [address],
            },
          ],
        });

        // Invalidate redemption loans
        queryClient.invalidateQueries({
          queryKey: [
            "readContract",
            {
              address: vaultAddress,
              functionName: "getRedemptionLoan",
            },
          ],
        });

        // Invalidate USDS token balance (user received borrowed USDS)
        const usdsTokenAddress = getTokenAddress(TokenName.USDS, chainId);
        if (usdsTokenAddress) {
          queryClient.invalidateQueries({
            queryKey: [
              "readContract",
              {
                address: usdsTokenAddress,
                functionName: "balanceOf",
              },
            ],
          });
        }

        queryClient.invalidateQueries({
          queryKey: ["readContracts"],
        });
      }
    }
  }, [isConfirmed, address, chainId, queryClient]);

  const borrowAgainstRedemption = ({ redemptionId }: { redemptionId: number }) => {
    const vaultAddress = getContractAddress(ContractName.DEPOSIT_REDEMPTION_VAULT, chainId);

    if (!vaultAddress) {
      console.error("Vault address not found for chain", chainId);
      return;
    }

    // Reset both Wagmi state and toast state for new transaction
    resetWrite();
    resetToast();

    writeContract({
      address: vaultAddress,
      abi: DepositRedemptionVaultABI,
      functionName: "borrowAgainstRedemption",
      args: [redemptionId],
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
    borrowAgainstRedemption,
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
