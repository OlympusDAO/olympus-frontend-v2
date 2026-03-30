import { useEffect, useRef } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { olympusGovernorBravoAbi } from "@/abis/OlympusGovernorBravo";
import { ContractName, getContractAddress } from "@/lib/contracts";
import { mainnet } from "@/lib/chains";
import { useTransactionToast, type TransactionToastConfig } from "@/lib/hooks/useTransactionToast";

/**
 * Mutation hook for casting a vote on a governance proposal.
 * Supports voting with an optional reason string.
 * Vote values: 0 = Against, 1 = For, 2 = Abstain.
 */
export function useVote() {
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
      queryClient.invalidateQueries({ queryKey: ["governance", "proposalVotes"] });
      proposalIdRef.current = undefined;
    }
  }, [isConfirmed, queryClient]);

  const toastConfig: TransactionToastConfig = {
    pending: {
      title: "Casting vote...",
      description: "Please wait while your transaction is confirmed.",
    },
    success: {
      title: "Vote cast successfully.",
      description: "Your vote has been recorded on-chain.",
    },
    error: {
      title: "Vote transaction failed",
      description: "There was an error casting your vote. Please try again.",
      userRejected: {
        title: "Transaction cancelled",
        description: "You cancelled the vote transaction.",
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

  const castVote = ({
    proposalId,
    vote,
    comment,
  }: {
    proposalId: number;
    vote: 0 | 1 | 2;
    comment?: string;
  }) => {
    if (!governorAddress) return;

    resetWrite();
    resetToast();
    proposalIdRef.current = proposalId;

    if (comment) {
      writeContract({
        address: governorAddress,
        abi: olympusGovernorBravoAbi,
        functionName: "castVoteWithReason",
        args: [BigInt(proposalId), vote, comment],
        chainId: mainnet.id,
      });
    } else {
      writeContract({
        address: governorAddress,
        abi: olympusGovernorBravoAbi,
        functionName: "castVote",
        args: [BigInt(proposalId), vote],
        chainId: mainnet.id,
      });
    }
  };

  const reset = () => {
    resetWrite();
    resetToast();
  };

  return {
    castVote,
    isPending: isWritePending || isConfirming,
    isSuccess: isConfirmed,
    error: writeError || confirmError,
    hash,
    reset,
  };
}
