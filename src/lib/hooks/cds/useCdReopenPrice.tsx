import { useChainId, useReadContracts } from "wagmi";
import { ContractName, getContractAddress } from "@/lib/contracts";
import EmissionManagerAbi from "@/abis/EmissionManager";

/**
 * The OHM price at which a paused CD market actually reopens.
 *
 * The EmissionManager only operates the auction when two conditions hold:
 * 1. The market premium over backing is at least `minimumPremium`.
 * 2. The premium-scaled emission covers at least one full tick; otherwise
 *    `getSizeFor` floors the auction size to zero and it stays offline.
 *
 * Solving both for price:
 *   reopenPrice = backing * (1 + minimumPremium)
 *               * max(1, tickSize / (supply * baseEmissionRate))
 */
export function useCdReopenPrice(chainIdOverride?: number) {
  const connectedChainId = useChainId();
  const chainId = chainIdOverride ?? connectedChainId;
  const contractAddress = getContractAddress(ContractName.EMISSION_MANAGER, chainId);

  const contracts = (
    ["backing", "minimumPremium", "baseEmissionRate", "tickSize", "getSupply"] as const
  ).map((functionName) => ({
    address: contractAddress,
    abi: EmissionManagerAbi,
    functionName,
    chainId,
  }));

  const { data, isLoading, error } = useReadContracts({
    contracts,
    query: {
      enabled: !!contractAddress,
      staleTime: 60_000,
    },
  });

  const reopenPrice = (() => {
    if (!data) return null;

    const [backing, minimumPremium, baseEmissionRate, tickSize, supply] = data.map((result) =>
      result.status === "success" ? (result.result as bigint) : null,
    );
    if (
      backing === null ||
      minimumPremium === null ||
      baseEmissionRate === null ||
      tickSize === null ||
      supply === null
    ) {
      return null;
    }

    // backing and minimumPremium are 18-decimal; tickSize, supply, and
    // baseEmissionRate are OHM-scale (9-decimal, rate is a fraction of supply)
    const minPremiumPrice = (Number(backing) / 1e18) * (1 + Number(minimumPremium) / 1e18);
    const baseEmission = (Number(supply) / 1e9) * (Number(baseEmissionRate) / 1e9);
    if (minPremiumPrice <= 0 || baseEmission <= 0) return null;

    return minPremiumPrice * Math.max(1, Number(tickSize) / 1e9 / baseEmission);
  })();

  return { reopenPrice, isLoading, error };
}
