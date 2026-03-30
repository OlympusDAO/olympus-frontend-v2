import { useQuery } from "@tanstack/react-query";
import { formatEther } from "viem";
import { usePublicClient } from "wagmi";
import { olympusGovernorBravoAbi } from "@/abis/OlympusGovernorBravo";
import { ContractName, getContractAddress } from "@/lib/contracts";
import { mainnet } from "@/lib/chains";
import {
  PROPOSAL_STATUS_MAP,
  getDateFromBlock,
  type ProposalStatus,
} from "@/modules/governance/helpers/proposal-status";

export type ProposalDetails = {
  id: number;
  proposer: string;
  status: ProposalStatus;
  forCount: number;
  againstCount: number;
  abstainCount: number;
  startBlock: number;
  endBlock: number;
  eta: number;
  etaDate: Date | undefined;
  quorumVotes: number;
  proposalThreshold: number;
  startDate: Date | undefined;
  endDate: Date | undefined;
};

/**
 * Reads on-chain proposal state, details, and vote counts for a given proposal ID.
 * Returns typed data with vote counts formatted in gOHM and estimated dates.
 */
export function useProposalDetails({ proposalId }: { proposalId: number }) {
  const publicClient = usePublicClient({ chainId: mainnet.id });
  const governorAddress = getContractAddress(ContractName.GOVERNOR_BRAVO, mainnet.id);

  return useQuery({
    queryKey: ["governance", "proposalDetails", mainnet.id, proposalId],
    queryFn: async (): Promise<ProposalDetails | null> => {
      if (!publicClient || !governorAddress) return null;

      const [state, proposalData, latestBlock] = await Promise.all([
        publicClient.readContract({
          address: governorAddress,
          abi: olympusGovernorBravoAbi,
          functionName: "state",
          args: [BigInt(proposalId)],
        }),
        publicClient.readContract({
          address: governorAddress,
          abi: olympusGovernorBravoAbi,
          functionName: "proposals",
          args: [BigInt(proposalId)],
        }),
        publicClient.getBlock({ blockTag: "latest" }),
      ]);

      // proposals() returns a tuple: [id, proposer, proposalThreshold, quorumVotes, eta,
      //   startBlock, endBlock, forVotes, againstVotes, abstainVotes, votingStarted, vetoed, canceled, executed]
      const [
        id,
        proposer,
        proposalThreshold,
        quorumVotes,
        eta,
        startBlock,
        endBlock,
        forVotes,
        againstVotes,
        abstainVotes,
      ] = proposalData;

      const currentBlock = Number(latestBlock.number);
      const currentTimestamp = Number(latestBlock.timestamp);

      // Try to get actual block timestamps for start/end, falling back to estimation
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      try {
        const [startBlockData, endBlockData] = await Promise.all([
          Number(startBlock) <= currentBlock
            ? publicClient.getBlock({ blockNumber: startBlock })
            : null,
          Number(endBlock) <= currentBlock
            ? publicClient.getBlock({ blockNumber: endBlock })
            : null,
        ]);

        startDate = startBlockData
          ? new Date(Number(startBlockData.timestamp) * 1000)
          : getDateFromBlock(Number(startBlock), currentBlock, currentTimestamp);
        endDate = endBlockData
          ? new Date(Number(endBlockData.timestamp) * 1000)
          : getDateFromBlock(Number(endBlock), currentBlock, currentTimestamp);
      } catch {
        startDate = getDateFromBlock(Number(startBlock), currentBlock, currentTimestamp);
        endDate = getDateFromBlock(Number(endBlock), currentBlock, currentTimestamp);
      }

      return {
        id: Number(id),
        proposer,
        status: PROPOSAL_STATUS_MAP[state] ?? "Pending",
        forCount: Number(formatEther(forVotes)),
        againstCount: Number(formatEther(againstVotes)),
        abstainCount: Number(formatEther(abstainVotes)),
        startBlock: Number(startBlock),
        endBlock: Number(endBlock),
        eta: Number(eta),
        etaDate: eta ? new Date(Number(eta) * 1000) : undefined,
        quorumVotes: Number(formatEther(quorumVotes)),
        proposalThreshold: Number(formatEther(proposalThreshold)),
        startDate,
        endDate,
      };
    },
    enabled: !!publicClient && !!governorAddress && !!proposalId,
  });
}
