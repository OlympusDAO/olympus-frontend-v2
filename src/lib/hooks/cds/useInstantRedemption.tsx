import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useAccount,
  useChainId,
} from "wagmi";
import { useTransactionToast, type TransactionToastConfig } from "@/lib/hooks/useTransactionToast";
import ConvertibleDepositFacilityAbi from "@/abis/ConvertibleDepositFacility";
import { ContractName, getContractAddress, requireContractAddress } from "@/lib/contracts";

interface UseInstantRedemptionParams {
  depositToken: string;
  depositPeriod: number;
  amount: bigint;
  queryKey?: unknown[];
}

interface UsePreviewReclaimParams {
  depositToken: string;
  depositPeriod: number;
  amount: bigint;
  enabled?: boolean;
}

interface UseReclaimRateParams {
  asset: string;
  depositPeriod: number;
  enabled?: boolean;
}

export function useInstantRedemption() {
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

  // Toast configuration for instant redemption transactions
  const toastConfig: TransactionToastConfig = {
    pending: {
      title: "Processing instant redemption...",
      description: "Please wait while your redemption is processed.",
    },
    success: {
      title: "Redemption successful!",
      description: "Your tokens have been redeemed instantly.",
    },
    error: {
      title: "Redemption failed",
      description: "There was an error processing your redemption. Please try again.",
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
      // Invalidate token balances that might be affected
      queryClient.invalidateQueries({
        queryKey: ["tokenBalances"],
      });
      queryClient.invalidateQueries({
        queryKey: ["userPositions"],
      });
    }
  }, [isConfirmed, address, chainId, queryClient]);

  const reclaim = ({
    depositToken,
    depositPeriod,
    amount,
    queryKey,
  }: UseInstantRedemptionParams) => {
    if (!chainId) throw new Error("No chain connected");

    const contractAddress = requireContractAddress(
      ContractName.CONVERTIBLE_DEPOSIT_FACILITY,
      chainId,
    );

    // Reset both Wagmi state and toast state for new transaction
    resetWrite();
    resetToast();

    writeContract(
      {
        address: contractAddress,
        abi: ConvertibleDepositFacilityAbi,
        functionName: "reclaim",
        args: [depositToken as `0x${string}`, depositPeriod as unknown as number, amount],
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
    reclaim,
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

export function usePreviewReclaim({
  depositToken,
  depositPeriod,
  amount,
  enabled = true,
}: UsePreviewReclaimParams) {
  const { chainId } = useAccount();

  const contractAddress = getContractAddress(ContractName.CONVERTIBLE_DEPOSIT_FACILITY, chainId);

  return useReadContract({
    address: contractAddress,
    abi: ConvertibleDepositFacilityAbi,
    functionName: "previewReclaim",
    args: [depositToken as `0x${string}`, depositPeriod as unknown as number, amount],
    query: {
      enabled: enabled && !!contractAddress && amount > 0n,
    },
  });
}

export function useReclaimRate({ asset, depositPeriod, enabled = true }: UseReclaimRateParams) {
  const { chainId } = useAccount();

  const contractAddress = getContractAddress(ContractName.CONVERTIBLE_DEPOSIT_FACILITY, chainId);

  const { data, ...rest } = useReadContract({
    address: contractAddress,
    abi: ConvertibleDepositFacilityAbi,
    functionName: "getAssetPeriodReclaimRate",
    args: [asset as `0x${string}`, depositPeriod as unknown as number],
    query: {
      enabled: enabled && !!contractAddress && !!asset,
    },
  });

  // Convert reclaim rate (uint16, basis points where 10000 = 100%) to fee percentage
  // e.g., reclaim rate of 9750 means 97.5% returned, so fee is 2.5%
  const reclaimRate = data as number | undefined;
  const feePercentage = reclaimRate !== undefined ? (10000 - reclaimRate) / 100 : undefined;

  return {
    reclaimRate,
    feePercentage,
    ...rest,
  };
}
