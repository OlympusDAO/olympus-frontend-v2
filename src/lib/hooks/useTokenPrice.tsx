import type { Address } from "viem";
import { parseUnits } from "viem";
import { useReadContract } from "wagmi";
import PriceAbi from "@/abis/Price";
import gOhmAbi from "@/abis/gOHM";
import { getTokenAddress, TokenName } from "@/lib/tokens";
import { getContractAddress, ContractName } from "@/lib/contracts";
import { formatTokenAmount } from "@/lib/math";

const ONE_GOHM = parseUnits("1", 18);
const PRICE_QUERY_OPTIONS = {
  staleTime: 60_000,
  gcTime: 5 * 60_000,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const;

function sameAddress(a?: Address, b?: Address): boolean {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}

export const useTokenPrice = (chainId: number, tokenAddress?: Address): { price: number } => {
  const ohmAddress = getTokenAddress(TokenName.OHM, chainId);
  const usdsAddress = getTokenAddress(TokenName.USDS, chainId);
  const gOhmAddress = getTokenAddress(TokenName.GOHM, chainId);
  const priceAddress = getContractAddress(ContractName.PRICE, chainId);

  const isOhmToken = sameAddress(tokenAddress, ohmAddress);
  const isUsdsToken = sameAddress(tokenAddress, usdsAddress);
  const isGOHMToken = sameAddress(tokenAddress, gOhmAddress);

  // PRICE module returns OHM price in reserve (USDS) with 18 decimals.
  const { data: ohmPriceRaw } = useReadContract({
    address: priceAddress,
    abi: PriceAbi,
    functionName: "getCurrentPrice",
    chainId,
    query: {
      ...PRICE_QUERY_OPTIONS,
      enabled: !!tokenAddress && !!priceAddress && (isOhmToken || isGOHMToken),
    },
  });

  // Convert exactly 1 gOHM to OHM via token contract helper.
  // balanceFrom returns OHM amount with OHM decimals (9).
  const { data: ohmFromOneGOHMRaw } = useReadContract({
    address: gOhmAddress,
    abi: gOhmAbi,
    functionName: "balanceFrom",
    args: [ONE_GOHM],
    chainId,
    query: {
      ...PRICE_QUERY_OPTIONS,
      enabled: !!tokenAddress && !!gOhmAddress && isGOHMToken,
    },
  });

  if (isUsdsToken) {
    // todo:Temporary assumption for stablecoin pricing.
    return { price: 1 };
  }

  if (isOhmToken) {
    return { price: ohmPriceRaw ? formatTokenAmount(ohmPriceRaw) : 0 };
  }

  if (isGOHMToken) {
    if (!ohmPriceRaw || !ohmFromOneGOHMRaw) return { price: 0 };

    const ohmPriceUsd = formatTokenAmount(ohmPriceRaw);
    const ohmPerGOHM = formatTokenAmount(ohmFromOneGOHMRaw, 9);

    return { price: ohmPriceUsd * ohmPerGOHM };
  }

  return { price: 0 };
};
