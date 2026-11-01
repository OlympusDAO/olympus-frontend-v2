import { useReadContract } from "wagmi";
import { erc20Abi } from "viem";
import { mainnet } from "@/lib/chains";
import { ContractName, getContractAddress } from "@/lib/contracts";
import { useMockData } from "@/lib/mock/provider";
import { getTokenAddress, TokenName } from "@/lib/tokens";
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
  const intoMainnet = destinationChainId === mainnet.id;

  const { data: poolBalance, isLoading: isLiquidityLoading } = useReadContract({
    address: getTokenAddress(TokenName.OHM, mainnet.id),
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [getContractAddress(ContractName.CCIP_TOKEN_POOL, mainnet.id)!],
    chainId: mainnet.id,
    query: { enabled: !mock && intoMainnet, refetchInterval: 60_000 },
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
      poolLiquidity: intoMainnet ? poolBalance : undefined,
    }),
    isLoading: route.status === "loading" || isLiquidityLoading,
  };
}
