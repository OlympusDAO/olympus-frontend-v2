import { useReadContract, useAccount } from "wagmi";
import { olympusGovernorBravoAbi } from "@/abis/OlympusGovernorBravo";
import { ContractName, getContractAddress } from "@/lib/contracts";
import { mainnet } from "@/lib/chains";

/**
 * Reads the vote receipt for the connected wallet on a specific proposal.
 * Returns { hasVoted, support, votes } from the governor contract.
 */
export function useVoteReceipt({ proposalId }: { proposalId: number }) {
  const { address } = useAccount();
  const governorAddress = getContractAddress(ContractName.GOVERNOR_BRAVO, mainnet.id);

  return useReadContract({
    address: governorAddress,
    abi: olympusGovernorBravoAbi,
    functionName: "getReceipt",
    args: address ? [BigInt(proposalId), address] : undefined,
    chainId: mainnet.id,
    query: {
      enabled: !!address && !!governorAddress && !!proposalId,
    },
  });
}
