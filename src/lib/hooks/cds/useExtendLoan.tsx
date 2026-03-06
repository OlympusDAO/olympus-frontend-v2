import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from "wagmi";
import { useTransactionToast, type TransactionToastConfig } from "@/lib/hooks/useTransactionToast";
import { getContractAddress, ContractName } from "@/lib/contracts";
import { getTokenAddress, TokenName } from "@/lib/tokens";
import DepositRedemptionVaultABI from "@/abis/DepositRedemptionVault";

export function useExtendLoan() {
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

  // Toast configuration for extend transactions
  const toastConfig: TransactionToastConfig = {
    pending: {
      title: "Extending loan...",
      description: "Please wait while your loan extension is processed.",
    },
    success: {
      title: "Loan extended successfully!",
      description: "Your loan due date has been extended.",
    },
    error: {
      title: "Extension failed",
      description: "There was an error extending your loan. Please try again.",
      userRejected: {
        title: "Extension cancelled",
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

  // Invalidate queries when extension succeeds
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

        // Invalidate USDS token balance (user spent USDS for interest)
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

        // Invalidate all readContracts queries
        queryClient.invalidateQueries({
          queryKey: ["readContracts"],
        });
      }
    }
  }, [isConfirmed, address, chainId, queryClient]);

  const extendLoan = ({ redemptionId, months }: { redemptionId: number; months: number }) => {
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
      functionName: "extendLoan",
      args: [redemptionId, months],
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
    extendLoan,
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
