import { useReadContract } from "wagmi";
import { erc20Abi } from "viem";
import { useMockData } from "@/lib/mock/provider";
import { getLiquidityPool } from "@/modules/ohm/utils/constants";
import { evaluateAmount } from "./amountLimits";
import type { TokenBucket } from "./routeState";
import { useBridgeRoute } from "./useBridgeRoute";

function availableTokens(bucket?: TokenBucket): bigint | null | undefined {
  if (!bucket) return undefined;
  return bucket.isEnabled ? bucket.tokens : null;
}

export function useBridgeLimits(sourceChainId: number, destinationChainId: number, amount: bigint) {
  const mock = useMockData();
  const route = useBridgeRoute(sourceChainId, destinationChainId);
  const liquidity = getLiquidityPool(destinationChainId);
  const intoMainnet = !!liquidity;

  const { data: poolBalance, isLoading: isLiquidityLoading } = useReadContract({
    address: liquidity?.ohm,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [liquidity?.pool as `0x${string}`],
    chainId: destinationChainId,
    query: { enabled: !mock && !!liquidity, refetchInterval: 60_000 },
  });

  if (mock?.scenario.bridge) {
    const { outboundTokens, inboundTokens, poolLiquidity } = mock.scenario.bridge;
    return {
      ...evaluateAmount({
        amount,
        outboundTokens: outboundTokens === undefined ? null : BigInt(outboundTokens),
        inboundTokens: inboundTokens === undefined ? null : BigInt(inboundTokens),
        poolLiquidity:
          intoMainnet && poolLiquidity !== undefined ? BigInt(poolLiquidity) : undefined,
      }),
      isLoading: false,
    };
  }

  return {
    ...evaluateAmount({
      amount,
      outboundTokens: availableTokens(route.outbound),
      inboundTokens: availableTokens(route.inbound),
      poolLiquidity: intoMainnet ? (poolBalance ?? null) : undefined,
    }),
    isLoading: route.status === "loading" || isLiquidityLoading,
  };
}
