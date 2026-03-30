import { useEffect, useRef } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { olympusGovernorBravoAbi } from "@/abis/OlympusGovernorBravo";
import { ContractName, getContractAddress } from "@/lib/contracts";
import { mainnet } from "@/lib/chains";
import { useTransactionToast, type TransactionToastConfig } from "@/lib/hooks/useTransactionToast";

/**
 * Mutation hook for activating a pending governance proposal.
 * Calls the activate() function on the governor contract.
 */
export function useActivateProposal() {
  const queryClient = useQueryClient();
  const proposalIdRef = useRef<number | undefined>(undefined);
  const governorAddress = getContractAddress(ContractName.GOVERNOR_BRAVO, mainnet.id);

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
    if (isConfirmed && proposalIdRef.current != null) {
      queryClient.invalidateQueries({
        queryKey: ["governance", "proposalDetails", mainnet.id, proposalIdRef.current],
      });
      proposalIdRef.current = undefined;
    }
  }, [isConfirmed, queryClient]);

  const toastConfig: TransactionToastConfig = {
    pending: {
      title: "Activating proposal...",
      description: "Please wait while your transaction is confirmed.",
    },
    success: {
      title: "Proposal activated.",
      description: "The proposal has been activated for voting.",
    },
    error: {
      title: "Activation failed",
      description: "There was an error activating the proposal. Please try again.",
      userRejected: {
        title: "Transaction cancelled",
        description: "You cancelled the activation transaction.",
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

  const activate = ({ proposalId }: { proposalId: number }) => {
    if (!governorAddress) return;

    resetWrite();
    resetToast();
    proposalIdRef.current = proposalId;

    writeContract({
      address: governorAddress,
      abi: olympusGovernorBravoAbi,
      functionName: "activate",
      args: [BigInt(proposalId)],
      chainId: mainnet.id,
    });
  };

  const reset = () => {
    resetWrite();
    resetToast();
  };

  return {
    activate,
    isPending: isWritePending || isConfirming,
    isSuccess: isConfirmed,
    error: writeError || confirmError,
    hash,
    reset,
  };
}
