import { useReadContract } from "wagmi";
import { zeroAddress } from "viem";
import gOHMAbi from "@/abis/gOHM";
import { ContractName, getContractAddress } from "@/lib/contracts";
import { mainnet } from "@/lib/chains";
import type { Address } from "viem";

/**
 * Reads the current delegation target for a given wallet address from the gOHM contract.
 * Returns an empty string if the address delegates to the zero address (no delegation),
 * otherwise returns the delegate address.
 */
export function useCheckDelegation({ address }: { address?: Address }) {
  const gohmAddress = getContractAddress(ContractName.GOHM, mainnet.id);

  const { data, isFetched, isLoading } = useReadContract({
    address: gohmAddress,
    abi: gOHMAbi,
    functionName: "delegates",
    args: address ? [address] : undefined,
    chainId: mainnet.id,
    query: {
      enabled: !!address && !!gohmAddress,
      select: (delegatee: Address): string => {
        return delegatee === zeroAddress ? "" : delegatee;
      },
    },
  });

  return { data: data as string | undefined, isFetched, isLoading };
}
