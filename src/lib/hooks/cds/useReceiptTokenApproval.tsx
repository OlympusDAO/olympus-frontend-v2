import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import type { Address } from "viem";
import { useReceiptTokenManager } from "./useReceiptTokenManager";
import { getContractAddress, ContractName } from "@/lib/contracts";
import { useChainId } from "wagmi";
import ReceiptTokenManagerABI from "@/abis/ReceiptTokenManager";
import { useQueryClient } from "@tanstack/react-query";
import { useDepositManager } from "./useDepositManager";
import {
  useTransactionToast,
  TransactionToastConfig,
} from "@/lib/hooks/useTransactionToast";

export function useReceiptTokenAllowance(
  tokenId: bigint | undefined,
  ownerAddress: Address | undefined
) {
  const chainId = useChainId();
  const { receiptTokenManagerAddress } = useReceiptTokenManager();
  const facilityAddress = getContractAddress(
    ContractName.CONVERTIBLE_DEPOSIT_FACILITY,
    chainId
  );

  const { depositManagerAddress } = useDepositManager(facilityAddress);

  const {
    data: allowance,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: receiptTokenManagerAddress,
    abi: ReceiptTokenManagerABI,
    functionName: "allowance",
    args:
      ownerAddress && depositManagerAddress && tokenId !== undefined
        ? [ownerAddress, depositManagerAddress, tokenId]
        : undefined,
    query: {
      enabled: !!(
        receiptTokenManagerAddress &&
        ownerAddress &&
        facilityAddress &&
        tokenId !== undefined
      ),
    },
  });

  return {
    allowance: allowance as bigint | undefined,
    isLoading,
    error,
    refetch,
  };
}

export function useApproveReceiptToken() {
  const queryClient = useQueryClient();
  const { receiptTokenManagerAddress } = useReceiptTokenManager();
  const chainId = useChainId();
  const facilityAddress = getContractAddress(
    ContractName.CONVERTIBLE_DEPOSIT_FACILITY,
    chainId
  );
  const { depositManagerAddress } = useDepositManager(facilityAddress);

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

  // Toast configuration for receipt token approval transactions
  const toastConfig: TransactionToastConfig = {
    pending: {
      title: "Approving receipt tokens...",
      description: "Please wait while your approval is confirmed.",
    },
    success: {
      title: "Receipt tokens approved successfully!",
      description: "You can now proceed with your conversion.",
    },
    error: {
      title: "Approval failed",
      description:
        "There was an error approving the receipt tokens. Please try again.",
      userRejected: {
        title: "Approval cancelled",
        description: "You cancelled the approval request.",
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

  const approveReceiptToken = ({
    tokenId,
    amount,
  }: {
    tokenId: bigint;
    amount: bigint;
  }) => {
    if (!receiptTokenManagerAddress || !depositManagerAddress) {
      throw new Error("Contract addresses not available");
    }

    // Reset both Wagmi state and toast state for new transaction
    resetWrite();
    resetToast();

    writeContract(
      {
        address: receiptTokenManagerAddress,
        abi: ReceiptTokenManagerABI,
        functionName: "approve",
        args: [depositManagerAddress, tokenId, amount],
      },
      {
        onSuccess: () => {
          // Invalidate allowance queries
          queryClient.invalidateQueries({
            queryKey: [
              {
                entity: "readContract",
                address: receiptTokenManagerAddress,
                functionName: "allowance",
              },
            ],
          });
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
    approveReceiptToken,
    isPending,
    isSuccess,
    isError: !!error,
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
