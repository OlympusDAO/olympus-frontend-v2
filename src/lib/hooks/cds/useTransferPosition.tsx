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
import { getContractAddress, ContractName } from "@/lib/contracts";
import ConvertibleDepositPositionManagerAbi from "@/abis/ConvertibleDepositPositionManager";

interface UseTransferPositionParams {
  positionId: number;
  to: `0x${string}`;
  queryKey?: unknown[];
}

export function useTransferPosition() {
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

  // Toast configuration for transfer position transactions
  const toastConfig: TransactionToastConfig = {
    pending: {
      title: "Transferring position...",
      description: "Please wait while your position is being transferred.",
    },
    success: {
      title: "Position transferred successfully!",
      description: "Your position has been transferred to the recipient.",
    },
    error: {
      title: "Transfer failed",
      description:
        "There was an error transferring your position. Please try again.",
      userRejected: {
        title: "Transfer cancelled",
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

  // Invalidate queries when transfer succeeds
  useEffect(() => {
    if (isConfirmed && address && chainId) {
      const positionManagerAddress = getContractAddress(
        ContractName.CONVERTIBLE_DEPOSIT_POSITION_MANAGER,
        chainId
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

        // Invalidate user positions
        queryClient.invalidateQueries({
          queryKey: ["userPositions"],
        });
      }

      queryClient.invalidateQueries({
        queryKey: ["readContracts"],
      });
    }
  }, [isConfirmed, address, chainId, queryClient]);

  const transferPosition = ({
    positionId,
    to,
    queryKey,
  }: UseTransferPositionParams) => {
    if (!chainId) throw new Error("No chain connected");
    if (!address) throw new Error("No user address connected");

    const contractAddress = getContractAddress(
      ContractName.CONVERTIBLE_DEPOSIT_POSITION_MANAGER,
      chainId
    );

    if (!contractAddress) {
      throw new Error("Position manager address not found");
    }

    // Reset both Wagmi state and toast state for new transaction
    resetWrite();
    resetToast();

    writeContract(
      {
        address: contractAddress,
        abi: ConvertibleDepositPositionManagerAbi,
        functionName: "safeTransferFrom",
        args: [
          address, // from (current owner)
          to, // to (recipient)
          BigInt(positionId), // tokenId
        ],
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
    transferPosition,
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
