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
import DepositRedemptionVaultAbi from "@/abis/DepositRedemptionVault";

interface UseCancelRedemptionParams {
  redemptionId: number;
  amount: bigint;
  queryKey?: unknown[];
}

export function useCancelRedemption() {
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

  // Toast configuration for cancel redemption transactions
  const toastConfig: TransactionToastConfig = {
    pending: {
      title: "Canceling redemption...",
      description: "Please wait while your redemption is being canceled.",
    },
    success: {
      title: "Redemption canceled successfully!",
      description:
        "Your redemption has been canceled and tokens are available again.",
    },
    error: {
      title: "Cancel redemption failed",
      description:
        "There was an error canceling your redemption. Please try again.",
      userRejected: {
        title: "Cancellation cancelled",
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

  // Invalidate queries when cancel redemption succeeds
  useEffect(() => {
    if (isConfirmed && address && chainId) {
      // Invalidate pending redemptions
      queryClient.invalidateQueries({
        queryKey: ["pendingRedemptions"],
      });

      // Invalidate user redemptions
      queryClient.invalidateQueries({
        queryKey: ["userRedemptions"],
      });

      // Invalidate token balances that might be affected
      queryClient.invalidateQueries({
        queryKey: ["tokenBalances"],
      });

      // Invalidate user positions
      queryClient.invalidateQueries({
        queryKey: ["readContracts"],
      });
    }
  }, [isConfirmed, address, chainId, queryClient]);

  const cancelRedemption = ({
    redemptionId,
    amount,
  }: UseCancelRedemptionParams) => {
    if (!chainId) throw new Error("No chain connected");

    const contractAddress = getContractAddress(
      ContractName.DEPOSIT_REDEMPTION_VAULT,
      chainId
    );

    if (!contractAddress) {
      throw new Error("Deposit redemption vault address not found");
    }

    // Reset both Wagmi state and toast state for new transaction
    resetWrite();
    resetToast();

    writeContract({
      address: contractAddress,
      abi: DepositRedemptionVaultAbi,
      functionName: "cancelRedemption",
      args: [redemptionId, amount],
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
    cancelRedemption,
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
