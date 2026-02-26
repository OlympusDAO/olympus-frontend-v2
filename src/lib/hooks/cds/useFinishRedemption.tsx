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

interface UseFinishRedemptionParams {
  redemptionId: number;
}

export function useFinishRedemption() {
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

  // Toast configuration for finish redemption transactions
  const toastConfig: TransactionToastConfig = {
    pending: {
      title: "Completing redemption...",
      description: "Please wait while your redemption is being completed.",
    },
    success: {
      title: "Redemption completed successfully!",
      description:
        "Your redemption has been completed and funds have been transferred.",
    },
    error: {
      title: "Complete redemption failed",
      description:
        "There was an error completing your redemption. Please try again.",
      userRejected: {
        title: "Transaction cancelled",
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

  // Invalidate queries when finish redemption succeeds
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

  const finishRedemption = ({ redemptionId }: UseFinishRedemptionParams) => {
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
      functionName: "finishRedemption",
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
    finishRedemption,
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
