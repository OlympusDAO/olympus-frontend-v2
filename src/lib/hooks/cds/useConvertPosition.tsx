import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from "wagmi";
import { useTransactionToast, type TransactionToastConfig } from "@/lib/hooks/useTransactionToast";
import { getContractAddress, ContractName } from "@/lib/contracts";
import ConvertibleDepositFacilityABI from "@/abis/ConvertibleDepositFacility";

interface ConvertPositionParams {
  positionIds: bigint[];
  amounts: bigint[];
  wrappedReceipt: boolean;
  queryKey?: unknown[];
}

export const useConvertPosition = () => {
  const { address } = useAccount();
  const chainId = useChainId();
  const queryClient = useQueryClient();

  const facilityAddress = getContractAddress(ContractName.CONVERTIBLE_DEPOSIT_FACILITY, chainId);

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

  // Invalidate user positions queries when conversion succeeds
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

  // Toast configuration for convert transactions
  const toastConfig: TransactionToastConfig = {
    pending: {
      title: "Converting position...",
      description: "Please wait while your position is converted to OHM.",
    },
    success: {
      title: "Position converted successfully!",
      description: "Your position has been converted to OHM at the locked-in price.",
    },
    error: {
      title: "Conversion failed",
      description: "There was an error converting your position. Please try again.",
      userRejected: {
        title: "Conversion cancelled",
        description: "You cancelled the conversion request.",
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

  const convert = ({ positionIds, amounts, wrappedReceipt, queryKey }: ConvertPositionParams) => {
    if (!facilityAddress) {
      throw new Error("Facility address not found");
    }

    // Reset both Wagmi state and toast state for new transaction
    resetWrite();
    resetToast();

    writeContract(
      {
        address: facilityAddress,
        abi: ConvertibleDepositFacilityABI,
        functionName: "convert",
        args: [positionIds, amounts, wrappedReceipt],
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
    convert,
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
