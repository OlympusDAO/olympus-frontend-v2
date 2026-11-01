import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import type { Address } from "viem";
import CCIPCrossChainBridgeAbi from "@/abis/CCIPCrossChainBridge";
import CCIPTokenAdminRegistryAbi from "@/abis/CCIPTokenAdminRegistry";
import CCIPTokenPoolAbi from "@/abis/CCIPTokenPool";
import { ContractName, getContractAddress } from "@/lib/contracts";
import { useMockData } from "@/lib/mock/provider";
import { getTokenAddress, TokenName } from "@/lib/tokens";
import {
  BRIDGEABLE_DESTINATIONS,
  CCIP_CHAIN_SELECTORS,
  isLockReleasePool,
} from "@/modules/ohm/utils/constants";
import { evaluateRoute, type RouteEndReads, type RouteState, type TokenBucket } from "./routeState";

const REFETCH_INTERVAL = 60_000;

type Direction = "outbound" | "inbound";

/** The reads for one end of a route, in the order `decodeRouteEnd` expects. */
export function routeEndContracts(chainId: number, remoteChainId: number, direction: Direction) {
  const bridge = getContractAddress(ContractName.CCIP_BRIDGE, chainId);
  const pool = getContractAddress(ContractName.CCIP_TOKEN_POOL, chainId);
  const registry = getContractAddress(ContractName.CCIP_TOKEN_ADMIN_REGISTRY, chainId);
  const ohm = getTokenAddress(TokenName.OHM, chainId);
  const remoteSelector = CCIP_CHAIN_SELECTORS[remoteChainId];
  if (!bridge || !pool || !registry || !ohm || remoteSelector === undefined) return undefined;

  return [
    { address: bridge, abi: CCIPCrossChainBridgeAbi, functionName: "isEnabled", chainId },
    {
      address: bridge,
      abi: CCIPCrossChainBridgeAbi,
      functionName: "getTrustedRemoteEVM",
      args: [remoteSelector],
      chainId,
    },
    {
      address: bridge,
      abi: CCIPCrossChainBridgeAbi,
      functionName: "getGasLimit",
      args: [remoteSelector],
      chainId,
    },
    {
      address: registry,
      abi: CCIPTokenAdminRegistryAbi,
      functionName: "getPool",
      args: [ohm],
      chainId,
    },
    {
      address: pool,
      abi: CCIPTokenPoolAbi,
      functionName: "isSupportedChain",
      args: [remoteSelector],
      chainId,
    },
    {
      address: pool,
      abi: CCIPTokenPoolAbi,
      functionName:
        direction === "outbound"
          ? "getCurrentOutboundRateLimiterState"
          : "getCurrentInboundRateLimiterState",
      args: [remoteSelector],
      chainId,
    },
    // Always last: the mainnet lock/release pool has no isEnabled, so it reads one entry fewer.
    ...(isLockReleasePool(chainId)
      ? []
      : [{ address: pool, abi: CCIPTokenPoolAbi, functionName: "isEnabled", chainId }]),
  ] as const;
}

type ReadResult = { status: "success" | "failure"; result?: unknown };

export function decodeRouteEnd(results: readonly ReadResult[] | undefined): RouteEndReads {
  if (!results || results.length === 0) return { failed: true };
  return {
    bridgeEnabled: results[0]?.result as boolean | undefined,
    trustedRemote: results[1]?.result as RouteEndReads["trustedRemote"],
    gasLimit: results[2]?.result as number | undefined,
    registeredPool: results[3]?.result as Address | undefined,
    poolSupportsRemote: results[4]?.result as boolean | undefined,
    bucket: results[5]?.result as TokenBucket | undefined,
    poolEnabled: results[6]?.result as boolean | undefined,
    failed: results.some((r) => r.status === "failure"),
  };
}

export type BridgeRouteState = RouteState & { outbound?: TokenBucket; inbound?: TokenBucket };

function evaluatePair(
  source: number,
  destination: number,
  sourceEnd: RouteEndReads,
  destinationEnd: RouteEndReads,
  isLoading: boolean,
): RouteState {
  const sourceBridge = getContractAddress(ContractName.CCIP_BRIDGE, source);
  const destinationBridge = getContractAddress(ContractName.CCIP_BRIDGE, destination);
  const sourcePool = getContractAddress(ContractName.CCIP_TOKEN_POOL, source);
  const destinationPool = getContractAddress(ContractName.CCIP_TOKEN_POOL, destination);
  if (!sourceBridge || !destinationBridge || !sourcePool || !destinationPool) {
    return { status: "unavailable", reason: "route-not-configured" };
  }
  return evaluateRoute({
    source: sourceEnd,
    destination: destinationEnd,
    expected: { sourceBridge, destinationBridge, sourcePool, destinationPool },
    sourceIsLockRelease: isLockReleasePool(source),
    destinationIsLockRelease: isLockReleasePool(destination),
    isLoading,
  });
}

/** Reads both ends of each pair and reports each route's state, refreshing so a shut-off lands without a reload. */
function useRoutePairs(sourceChainId: number, destinations: readonly number[]) {
  const mock = useMockData();

  const entries = useMemo(
    () =>
      destinations.map((destination) => ({
        destination,
        source: routeEndContracts(sourceChainId, destination, "outbound"),
        remote: routeEndContracts(destination, sourceChainId, "inbound"),
      })),
    [sourceChainId, destinations],
  );

  const contracts = useMemo(
    () => entries.flatMap((e) => [...(e.source ?? []), ...(e.remote ?? [])]),
    [entries],
  );

  const { data, isLoading } = useReadContracts({
    contracts,
    allowFailure: true,
    query: { enabled: !mock && contracts.length > 0, refetchInterval: REFETCH_INTERVAL },
  });

  return useMemo(() => {
    const states: Record<number, BridgeRouteState> = {};
    let offset = 0;
    for (const { destination, source, remote } of entries) {
      if (mock?.scenario.bridge) {
        const { routes } = mock.scenario.bridge;
        states[destination] =
          routes === "available"
            ? { status: "available" }
            : {
                status: "unavailable",
                reason: routes === "route-paused" ? "route-paused" : "bridge-disabled",
              };
        continue;
      }

      const sourceSize = source?.length ?? 0;
      const remoteSize = remote?.length ?? 0;
      const sourceEnd = decodeRouteEnd(data?.slice(offset, offset + sourceSize) as ReadResult[]);
      const remoteEnd = decodeRouteEnd(
        data?.slice(offset + sourceSize, offset + sourceSize + remoteSize) as ReadResult[],
      );
      offset += sourceSize + remoteSize;

      states[destination] = {
        ...evaluatePair(sourceChainId, destination, sourceEnd, remoteEnd, isLoading),
        outbound: sourceEnd.bucket,
        inbound: remoteEnd.bucket,
      };
    }
    return states;
  }, [entries, data, isLoading, mock, sourceChainId]);
}

export function useBridgeRoute(
  sourceChainId: number,
  destinationChainId: number,
): BridgeRouteState {
  const destinations = useMemo(() => [destinationChainId], [destinationChainId]);
  const states = useRoutePairs(sourceChainId, destinations);
  return states[destinationChainId] ?? { status: "loading" };
}

export function useBridgeRoutes(sourceChainId: number): Record<number, BridgeRouteState> {
  return useRoutePairs(sourceChainId, BRIDGEABLE_DESTINATIONS[sourceChainId] ?? []);
}
