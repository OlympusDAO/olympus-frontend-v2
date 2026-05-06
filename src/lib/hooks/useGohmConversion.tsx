import { useMemo } from "react";
import { useReadContract, useChainId } from "wagmi";
import { parseUnits, parseEther, formatUnits, formatEther } from "viem";
import { getTokenAddress, TokenName } from "@/lib/tokens";
import gOHMAbi from "@/abis/gOHM";

/** Trim trailing zeros from a decimal string, keeping at least `minDecimals` places. */
function trimDecimals(value: string, maxDecimals: number, minDecimals = 2): string {
  const num = parseFloat(value);
  if (Number.isNaN(num)) return value;
  const fixed = num.toFixed(maxDecimals);
  const [int, dec] = fixed.split(".");
  if (!dec) return fixed;
  const trimmed = dec.replace(/0+$/, "").padEnd(minDecimals, "0");
  return `${int}.${trimmed}`;
}

/** Read the gOHM contract's index (the source of truth for conversions). */
export function useGohmIndex() {
  const chainId = useChainId();
  const gohmAddress = getTokenAddress(TokenName.GOHM, chainId);

  const { data: index, isLoading } = useReadContract({
    address: gohmAddress,
    abi: gOHMAbi,
    functionName: "index",
    query: {
      enabled: !!gohmAddress,
    },
  });

  return { index: index as bigint | undefined, isLoading };
}

/**
 * Compute wrap/unwrap conversion using the gOHM index with client-side bigint math.
 * Matches gOHM.balanceTo / gOHM.balanceFrom exactly.
 */
export function useGohmConversion(mode: "wrap" | "unwrap", inputAmount: string) {
  const { index } = useGohmIndex();

  const outputAmount = useMemo(() => {
    if (!inputAmount || !index || parseFloat(inputAmount) === 0) return "";

    try {
      if (mode === "wrap") {
        // gOHM.balanceTo: gOHM = sOHM * 1e18 / index
        const ohmBigInt = parseUnits(inputAmount, 9);
        const gohmBigInt = (ohmBigInt * 10n ** 18n) / index;
        return trimDecimals(formatEther(gohmBigInt), 6);
      }
      // gOHM.balanceFrom: sOHM = gOHM * index / 1e18
      const gohmBigInt = parseEther(inputAmount);
      const ohmBigInt = (gohmBigInt * index) / 10n ** 18n;
      return trimDecimals(formatUnits(ohmBigInt, 9), 4);
    } catch {
      return "";
    }
  }, [inputAmount, index, mode]);

  return { outputAmount };
}

/**
 * Conversion rates using the gOHM index.
 */
export function useGohmConversionRate() {
  const { index, isLoading } = useGohmIndex();

  const rates = useMemo(() => {
    if (!index) return { ohmPerGohm: undefined, gohmPerOhm: undefined };

    // gOHM index is OHM per 1 gOHM, scaled to 9 decimals.
    const ohmPerGohm = trimDecimals(formatUnits(index, 9), 3);
    // 1 OHM (1e9) -> gOHM: gOHM = 1e9 * 1e18 / index
    const gohmBigInt = (10n ** 9n * 10n ** 18n) / index;
    const gohmPerOhm = trimDecimals(formatEther(gohmBigInt), 6);

    return { ohmPerGohm, gohmPerOhm };
  }, [index]);

  return { ...rates, isLoading };
}

/** Read the total supply of gOHM from the contract (returns bigint in 18 decimals). */
export function useGohmTotalSupply() {
  const chainId = useChainId();
  const gohmAddress = getTokenAddress(TokenName.GOHM, chainId);
  const { data } = useReadContract({
    address: gohmAddress,
    abi: gOHMAbi,
    functionName: "totalSupply",
    query: { enabled: !!gohmAddress },
  });
  return { totalSupply: data as bigint | undefined };
}
