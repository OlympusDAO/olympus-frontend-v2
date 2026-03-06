import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from "wagmi";
import { useTransactionToast, type TransactionToastConfig } from "@/lib/hooks/useTransactionToast";
import DepositRedemptionVaultAbi from "@/abis/DepositRedemptionVault";
import { ContractName, getContractAddress, requireContractAddress } from "@/lib/contracts";
import { getTokenAddress, TokenName } from "@/lib/tokens";

interface UseFullRedemptionParams {
  depositPeriod: number;
  amount: bigint;
  facility: `0x${string}`;
  queryKey?: unknown[];
}

export function useFullRedemption() {
  const { address } = useAccount();
  const chainId = useChainId();
  const queryClient = useQueryClient();

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

  // Toast configuration for full redemption transactions
  const toastConfig: TransactionToastConfig = {
    pending: {
      title: "Starting full redemption...",
      description: "Please wait while your redemption is queued.",
    },
    success: {
      title: "Full redemption started!",
      description: "Your redemption has been queued. You can claim after the waiting period.",
    },
    error: {
      title: "Redemption failed",
      description: "There was an error starting your redemption. Please try again.",
      userRejected: {
        title: "Redemption cancelled",
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

  // Invalidate queries when redemption succeeds
  useEffect(() => {
    if (isConfirmed && address && chainId) {
      const contractAddress = getContractAddress(ContractName.DEPOSIT_REDEMPTION_VAULT, chainId);

      if (contractAddress) {
        // Invalidate getUserRedemptionCount query - this will trigger usePendingRedemptions to refetch
        queryClient.invalidateQueries({
          queryKey: [
            "readContract",
            {
              address: contractAddress,
              functionName: "getUserRedemptionCount",
              args: [address],
            },
          ],
        });

        // Invalidate all readContracts queries for getUserRedemption
        queryClient.invalidateQueries({
          queryKey: [
            "readContracts",
            {
              contracts: [
                {
                  address: contractAddress,
                  functionName: "getUserRedemption",
                },
              ],
            },
          ],
        });
      }

      // Invalidate token balances and other related queries
      queryClient.invalidateQueries({
        queryKey: ["tokenBalances"],
      });
      queryClient.invalidateQueries({
        queryKey: ["userPositions"],
      });
      queryClient.invalidateQueries({
        queryKey: ["pendingRedemptions"],
      });
      queryClient.invalidateQueries({
        queryKey: ["userRedemptions"],
      });
      queryClient.invalidateQueries({
        queryKey: ["readContracts"],
      });
    }
  }, [isConfirmed, address, chainId, queryClient]);

  const startRedemption = ({
    depositPeriod,
    amount,
    facility,
    queryKey,
  }: UseFullRedemptionParams) => {
    if (!chainId) throw new Error("No chain connected");

    const contractAddress = requireContractAddress(ContractName.DEPOSIT_REDEMPTION_VAULT, chainId);
    const tokenAddress = getTokenAddress(TokenName.USDS, chainId);
    if (!tokenAddress) throw new Error("Token address not found");

    // Reset both Wagmi state and toast state for new transaction
    resetWrite();
    resetToast();

    writeContract(
      {
        address: contractAddress,
        abi: DepositRedemptionVaultAbi,
        functionName: "startRedemption",
        args: [tokenAddress, depositPeriod, amount, facility],
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
    startRedemption,
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
