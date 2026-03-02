import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from "wagmi";
import { useTransactionToast, type TransactionToastConfig } from "@/lib/hooks/useTransactionToast";
import { getContractAddress, ContractName } from "@/lib/contracts";
import ConvertibleDepositPositionManagerABI from "@/abis/ConvertibleDepositPositionManager";

interface WrapPositionParams {
  positionId: bigint;
  queryKey?: unknown[];
}

export const useWrapPosition = () => {
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

  // Toast configuration for wrap position transactions
  const toastConfig: TransactionToastConfig = {
    pending: {
      title: "Wrapping position...",
      description: "Please wait while your position is being wrapped as an NFT.",
    },
    success: {
      title: "Position wrapped successfully!",
      description: "Your position is now an NFT. You can trade or transfer it.",
    },
    error: {
      title: "Wrap failed",
      description: "There was an error wrapping your position. Please try again.",
      userRejected: {
        title: "Wrap cancelled",
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

  // Invalidate queries when wrap succeeds
  useEffect(() => {
    if (isConfirmed && address && chainId) {
      const positionManagerAddress = getContractAddress(
        ContractName.CONVERTIBLE_DEPOSIT_POSITION_MANAGER,
        chainId,
      );

      if (positionManagerAddress) {
        // Invalidate wagmi queries for user positions
        queryClient.invalidateQueries({
          queryKey: [
            "readContract",
            {
              address: positionManagerAddress,
              functionName: "getUserPositionIds",
              args: [address],
            },
          ],
        });

        // Also invalidate all getPosition queries for this contract
        queryClient.invalidateQueries({
          queryKey: [
            "readContracts",
            {
              contracts: [
                {
                  address: positionManagerAddress,
                  functionName: "getPosition",
                },
              ],
            },
          ],
        });

        // Invalidate token balances that might also be affected
        queryClient.invalidateQueries({
          queryKey: ["tokenBalances"],
        });
      }

      queryClient.invalidateQueries({
        queryKey: ["readContracts"],
      });
    }
  }, [isConfirmed, address, chainId, queryClient]);

  const wrap = ({ positionId, queryKey }: WrapPositionParams) => {
    const positionManagerAddress = getContractAddress(
      ContractName.CONVERTIBLE_DEPOSIT_POSITION_MANAGER,
      chainId,
    );

    if (!positionManagerAddress) {
      throw new Error("Position manager address not found");
    }

    // Reset both Wagmi state and toast state for new transaction
    resetWrite();
    resetToast();

    writeContract(
      {
        address: positionManagerAddress,
        abi: ConvertibleDepositPositionManagerABI,
        functionName: "wrap",
        args: [positionId],
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
    wrap,
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
