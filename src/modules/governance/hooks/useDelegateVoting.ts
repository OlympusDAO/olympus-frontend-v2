import { useEffect, useRef } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import gOHMAbi from "@/abis/gOHM";
import { ContractName, getContractAddress } from "@/lib/contracts";
import { mainnet } from "@/lib/chains";
import { useTransactionToast, type TransactionToastConfig } from "@/lib/hooks/useTransactionToast";
import type { Address } from "viem";
import { trackDelegate, trackTransactionFailed } from "@/lib/analytics";

/**
 * Mutation hook for delegating gOHM voting power to another address.
 * Calls the delegate() function on the gOHM contract.
 */
export function useDelegateVoting() {
  const queryClient = useQueryClient();
  const gohmAddress = getContractAddress(ContractName.GOHM, mainnet.id);
  const delegateeRef = useRef<string | undefined>(undefined);

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
      trackDelegate({ delegatee: delegateeRef.current ?? "", txHash: hash });
      delegateeRef.current = undefined;
      queryClient.invalidateQueries({ queryKey: [{ entity: "readContract" }] });
      queryClient.invalidateQueries({ queryKey: ["governance", "votingWeight"] });
    }
  }, [isConfirmed, queryClient]);

  const error = writeError || confirmError;
  useEffect(() => {
    if (error) {
      const reason = error.message?.includes("User rejected") ? "user_rejected" : "error";
      trackTransactionFailed("dao", "delegate", { reason });
    }
  }, [error]);

  const toastConfig: TransactionToastConfig = {
    pending: {
      title: "Delegating voting power...",
      description: "Please wait while your transaction is confirmed.",
    },
    success: {
      title: "Delegation successful.",
      description: "Your voting power has been delegated.",
    },
    error: {
      title: "Delegation failed",
      description: "There was an error delegating your voting power. Please try again.",
      userRejected: {
        title: "Transaction cancelled",
        description: "You cancelled the delegation transaction.",
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

  const delegate = ({ delegationAddress }: { delegationAddress: Address }) => {
    if (!gohmAddress) return;

    resetWrite();
    resetToast();
    delegateeRef.current = delegationAddress;

    writeContract({
      address: gohmAddress,
      abi: gOHMAbi,
      functionName: "delegate",
      args: [delegationAddress],
      chainId: mainnet.id,
    });
  };

  const reset = () => {
    resetWrite();
    resetToast();
  };

  return {
    delegate,
    isPending: isWritePending || isConfirming,
    isSuccess: isConfirmed,
    error: writeError || confirmError,
    hash,
    reset,
  };
}
