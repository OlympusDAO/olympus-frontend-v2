import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from "wagmi";
import { getContractAddress, ContractName } from "@/lib/contracts";
import ConvertibleDepositPositionManagerABI from "@/abis/ConvertibleDepositPositionManager";
import { useTransactionToast, type TransactionToastConfig } from "@/lib/hooks/useTransactionToast";

export function useUnwrapPosition() {
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

  // Toast configuration for unwrap transactions
  const toastConfig: TransactionToastConfig = {
    pending: {
      title: "Unwrapping position...",
      description: "Please wait while your position is unwrapped.",
    },
    success: {
      title: "Position unwrapped successfully!",
      description: "NFT burned and position reactivated. Your position is no longer transferable.",
    },
    error: {
      title: "Unwrap failed",
      description: "There was an error unwrapping your position. Please try again.",
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

  // Invalidate user positions queries when unwrap succeeds
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

        queryClient.invalidateQueries({
          queryKey: ["readContracts"],
        });
      }
    }
  }, [isConfirmed, address, chainId, queryClient]);

  const unwrap = ({
    positionId,
    queryKey,
  }: {
    positionId: bigint;
    queryKey?: readonly unknown[];
  }) => {
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
        functionName: "unwrap",
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
}
