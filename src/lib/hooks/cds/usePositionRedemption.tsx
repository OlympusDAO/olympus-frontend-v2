import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useChainId,
} from "wagmi";
import {
  useTransactionToast,
  TransactionToastConfig,
} from "@/lib/hooks/useTransactionToast";
import DepositRedemptionVaultAbi from "@/abis/DepositRedemptionVault";
import {
  ContractName,
  getContractAddress,
  requireContractAddress,
} from "@/lib/contracts";

interface UsePositionRedemptionParams {
  positionId: bigint;
  amount: bigint;
  queryKey?: unknown[];
}

export function usePositionRedemption() {
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

  // Toast configuration for position redemption transactions
  const toastConfig: TransactionToastConfig = {
    pending: {
      title: "Starting position redemption...",
      description: "Please wait while your position redemption is queued.",
    },
    success: {
      title: "Position redemption started!",
      description:
        "Your position redemption has been queued. You can claim after the waiting period.",
    },
    error: {
      title: "Position redemption failed",
      description:
        "There was an error starting your position redemption. Please try again.",
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
      const contractAddress = getContractAddress(
        ContractName.DEPOSIT_REDEMPTION_VAULT,
        chainId
      );

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

  const startPositionRedemption = ({
    positionId,
    amount,
    queryKey,
  }: UsePositionRedemptionParams) => {
    if (!chainId) throw new Error("No chain connected");

    const contractAddress = requireContractAddress(
      ContractName.DEPOSIT_REDEMPTION_VAULT,
      chainId
    );

    // Reset both Wagmi state and toast state for new transaction
    resetWrite();
    resetToast();

    writeContract(
      {
        address: contractAddress,
        abi: DepositRedemptionVaultAbi,
        functionName: "startRedemption",
        args: [positionId, amount],
      },
      {
        onSuccess: () => {
          if (queryKey) {
            queryClient.invalidateQueries({ queryKey });
          }
        },
      }
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
    startPositionRedemption,
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