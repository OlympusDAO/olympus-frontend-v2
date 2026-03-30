import { useQuery } from "@tanstack/react-query";
import { formatEther, formatUnits } from "viem";
import { usePublicClient } from "wagmi";
import { olympusGovernorBravoAbi } from "@/abis/OlympusGovernorBravo";
import gOHMAbi from "@/abis/gOHM";
import { ContractName, getContractAddress } from "@/lib/contracts";
import { mainnet } from "@/lib/chains";

/** Inline ABI fragment for the Timelock delay() view function. */
const timelockAbi = [
  {
    inputs: [],
    name: "delay",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/** Precision factor used in the governor for percentage calculations (1e8). */
const PRECISION_FACTOR = 100_000_000n;

/** Approximate blocks per day on Ethereum mainnet (~12s block time). */
const BLOCKS_PER_DAY = 7200n;

export type GovernanceParameters = {
  /** Absolute number of gOHM tokens needed to submit a proposal. */
  proposalThreshold: string;
  /** Proposal threshold as a raw percentage (e.g., 0.01 = 1%). */
  proposalThresholdPercent: number;
  /** Approval threshold as a percentage (e.g., 50). */
  proposalApprovalThreshold: number;
  /** Absolute number of gOHM tokens needed for quorum. */
  proposalQuorum: string;
  /** Quorum as a percentage (e.g., 33). */
  proposalQuorumPercent: number;
  /** Human-readable voting delay (e.g., "1 Days"). */
  votingDelay: string;
  /** Human-readable voting period (e.g., "7 Days"). */
  votingPeriod: string;
  /** Human-readable execution delay (e.g., "1 Day"). */
  executionDelay: string;
  /** Human-readable activation grace period (e.g., "2 Day"). */
  activationGracePeriod: string;
  /** Timelock contract address. */
  timelockContract: string;
  /** Governor contract address. */
  governanceContract: string;
  /** gOHM contract address. */
  gohmContract: string;
};

/**
 * Batch reads governor contract parameters and the timelock delay.
 * Computes human-readable threshold/quorum values from the total gOHM supply.
 */
export function useContractParameters() {
  const publicClient = usePublicClient({ chainId: mainnet.id });
  const governorAddress = getContractAddress(ContractName.GOVERNOR_BRAVO, mainnet.id);
  const gohmAddress = getContractAddress(ContractName.GOHM, mainnet.id);

  return useQuery({
    queryKey: ["governance", "contractParameters", mainnet.id],
    queryFn: async (): Promise<GovernanceParameters | null> => {
      if (!publicClient || !governorAddress || !gohmAddress) return null;

      // Batch read all governor parameters and gOHM total supply in parallel
      const [
        totalSupply,
        proposalThresholdPct,
        approvalThresholdPct,
        quorumPct,
        votingDelay,
        votingPeriod,
        activationGracePeriod,
        timelockAddress,
      ] = await Promise.all([
        publicClient.readContract({
          address: gohmAddress,
          abi: gOHMAbi,
          functionName: "totalSupply",
        }),
        publicClient.readContract({
          address: governorAddress,
          abi: olympusGovernorBravoAbi,
          functionName: "proposalThreshold",
        }),
        publicClient.readContract({
          address: governorAddress,
          abi: olympusGovernorBravoAbi,
          functionName: "approvalThresholdPct",
        }),
        publicClient.readContract({
          address: governorAddress,
          abi: olympusGovernorBravoAbi,
          functionName: "quorumPct",
        }),
        publicClient.readContract({
          address: governorAddress,
          abi: olympusGovernorBravoAbi,
          functionName: "votingDelay",
        }),
        publicClient.readContract({
          address: governorAddress,
          abi: olympusGovernorBravoAbi,
          functionName: "votingPeriod",
        }),
        publicClient.readContract({
          address: governorAddress,
          abi: olympusGovernorBravoAbi,
          functionName: "activationGracePeriod",
        }),
        publicClient.readContract({
          address: governorAddress,
          abi: olympusGovernorBravoAbi,
          functionName: "timelock",
        }),
      ]);

      // Read the timelock delay
      const timelockDelay = await publicClient.readContract({
        address: timelockAddress,
        abi: timelockAbi,
        functionName: "delay",
      });

      const supply = totalSupply as bigint;
      const thresholdPct = proposalThresholdPct as bigint;
      const approvalPct = approvalThresholdPct as bigint;
      const quorum = quorumPct as bigint;

      return {
        proposalThreshold: formatEther((supply * thresholdPct) / PRECISION_FACTOR),
        proposalThresholdPercent: Number(formatUnits(thresholdPct, 8)),
        proposalApprovalThreshold: Number(formatUnits(approvalPct, 8)) * 100,
        proposalQuorum: formatEther((supply * quorum) / PRECISION_FACTOR),
        proposalQuorumPercent: Number(formatUnits(quorum, 8)) * 100,
        votingDelay: `${(votingDelay as bigint) / BLOCKS_PER_DAY} Days`,
        votingPeriod: `${(votingPeriod as bigint) / BLOCKS_PER_DAY} Days`,
        executionDelay: `${(timelockDelay as bigint) / 86400n} Day`,
        activationGracePeriod: `${(activationGracePeriod as bigint) / BLOCKS_PER_DAY} Day`,
        timelockContract: timelockAddress as string,
        governanceContract: governorAddress,
        gohmContract: gohmAddress,
      };
    },
    enabled: !!publicClient && !!governorAddress && !!gohmAddress,
  });
}
