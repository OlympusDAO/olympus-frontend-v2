import { useQuery } from "@tanstack/react-query";
import { formatEther } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import gOHMAbi from "@/abis/gOHM";
import { ContractName, getContractAddress } from "@/lib/contracts";
import { mainnet } from "@/lib/chains";

/**
 * Reads the connected wallet's voting weight from the gOHM contract.
 * Returns the minimum of current votes and prior votes at the proposal's start block.
 * This matches how the governor contract determines voting power.
 *
 * If `startBlock` is not provided or the current block is before startBlock (proposal
 * not yet activated), returns the current voting power.
 */
export function useVotingWeight({ startBlock }: { startBlock?: number }) {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: mainnet.id });
  const gohmAddress = getContractAddress(ContractName.GOHM, mainnet.id);

  return useQuery({
    queryKey: ["governance", "votingWeight", address, startBlock],
    queryFn: async () => {
      if (!address || !publicClient || !gohmAddress) return "0";

      const currentBlock = await publicClient.getBlock({ blockTag: "latest" });
      const currentVotes = await publicClient.readContract({
        address: gohmAddress,
        abi: gOHMAbi,
        functionName: "getCurrentVotes",
        args: [address],
      });

      // If proposal is not yet activated, return current votes
      if (!startBlock || Number(currentBlock.number) < startBlock) {
        return formatEther(currentVotes);
      }

      // Once activated, the contract uses the lesser of votes at activation or current votes
      const priorVotes = await publicClient.readContract({
        address: gohmAddress,
        abi: gOHMAbi,
        functionName: "getPriorVotes",
        args: [address, BigInt(startBlock)],
      });

      const votes = priorVotes > currentVotes ? priorVotes : currentVotes;
      return formatEther(votes);
    },
    enabled: !!publicClient && !!address && !!gohmAddress,
  });
}
