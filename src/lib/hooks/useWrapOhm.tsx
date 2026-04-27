import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from "wagmi";
import { ContractName, getContractAddress } from "@/lib/contracts";
import { TokenName, getTokenAddress } from "@/lib/tokens";
import OlympusStakingAbi from "@/abis/OlympusStaking";
import { useTransactionToast, type TransactionToastConfig } from "./useTransactionToast";

export function useWrapOhm() {
  const queryClient = useQueryClient();
  const queryKeyRef = useRef<readonly unknown[] | undefined>(undefined);
  const { address } = useAccount();
  const chainId = useChainId();

  const stakingAddress = getContractAddress(ContractName.STAKING, chainId);
  const ohmAddress = getTokenAddress(TokenName.OHM, chainId);
  const gohmAddress = getTokenAddress(TokenName.GOHM, chainId);

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
    if (isConfirmed) {
      // Invalidate allowance query
      if (queryKeyRef.current) {
        queryClient.invalidateQueries({ queryKey: queryKeyRef.current });
        queryKeyRef.current = undefined;
      }
      // Invalidate OHM and gOHM balance queries so UI reflects new balances
      const affectedAddresses = [ohmAddress, gohmAddress].filter(Boolean);
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) &&
            key.some(
              (k) =>
                typeof k === "object" &&
                k !== null &&
                "functionName" in k &&
                k.functionName === "balanceOf" &&
                "address" in k &&
                affectedAddresses.includes(k.address as `0x${string}`),
            )
          );
        },
      });
    }
  }, [isConfirmed, queryClient, ohmAddress, gohmAddress]);

  const toastConfig: TransactionToastConfig = {
    pending: {
      title: "Wrapping OHM...",
      description: "Please wait while your transaction is confirmed.",
    },
    success: {
      title: "Wrap OHM to gOHM transaction executed.",
      description: "Your OHM has been wrapped to gOHM.",
    },
    error: {
      title: "Wrap transaction failed",
      description: "There was an error wrapping OHM. Please try again.",
      userRejected: {
        title: "Transaction cancelled",
        description: "You cancelled the wrap transaction.",
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

  const wrap = ({ amount, queryKey }: { amount: bigint; queryKey?: readonly unknown[] }) => {
    if (!address || !stakingAddress) return;

    resetWrite();
    resetToast();

    if (queryKey) {
      queryKeyRef.current = queryKey;
    }

    // stake(to, amount, rebasing=false, claim=true) -> returns gOHM
    writeContract({
      address: stakingAddress,
      abi: OlympusStakingAbi,
      functionName: "stake",
      args: [address, amount, false, true],
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
    wrap,
    isPending,
    isSuccess,
    error,
    hash,
    reset,
    isWritePending,
    isConfirming,
  };
}
