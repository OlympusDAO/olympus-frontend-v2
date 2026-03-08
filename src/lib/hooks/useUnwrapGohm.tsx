import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from "wagmi";
import { ContractName, getContractAddress } from "@/lib/contracts";
import OlympusStakingAbi from "@/abis/OlympusStaking";
import { useTransactionToast, type TransactionToastConfig } from "./useTransactionToast";

export function useUnwrapGohm() {
  const queryClient = useQueryClient();
  const queryKeyRef = useRef<readonly unknown[] | undefined>(undefined);
  const { address } = useAccount();
  const chainId = useChainId();

  const stakingAddress = getContractAddress(ContractName.STAKING, chainId);

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

  useEffect(() => {
    if (isConfirmed && queryKeyRef.current) {
      queryClient.invalidateQueries({ queryKey: queryKeyRef.current });
      queryKeyRef.current = undefined;
    }
  }, [isConfirmed, queryClient]);

  const toastConfig: TransactionToastConfig = {
    pending: {
      title: "Unwrapping gOHM...",
      description: "Please wait while your transaction is confirmed.",
    },
    success: {
      title: "Unwrap gOHM transaction executed.",
      description: "Your gOHM has been unwrapped to OHM.",
    },
    error: {
      title: "Unwrap transaction failed",
      description: "There was an error unwrapping gOHM. Please try again.",
      userRejected: {
        title: "Transaction cancelled",
        description: "You cancelled the unwrap transaction.",
      },
      insufficientFunds: {
        title: "Insufficient funds",
        description: "You don't have enough ETH for gas fees.",
      },
    },
  };

  const { reset: resetToast } = useTransactionToast({
    hash,
    isWritePending,
    isConfirmed,
    writeError,
    confirmError,
    config: toastConfig,
  });

  const unwrap = ({ amount, queryKey }: { amount: bigint; queryKey?: readonly unknown[] }) => {
    if (!address || !stakingAddress) return;

    resetWrite();
    resetToast();

    if (queryKey) {
      queryKeyRef.current = queryKey;
    }

    // unstake(to, amount, trigger=false, rebasing=false) -> gOHM input, returns OHM
    writeContract({
      address: stakingAddress,
      abi: OlympusStakingAbi,
      functionName: "unstake",
      args: [address, amount, false, false],
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
    unwrap,
    isPending,
    isSuccess,
    error,
    hash,
    reset,
    isWritePending,
    isConfirming,
  };
}
