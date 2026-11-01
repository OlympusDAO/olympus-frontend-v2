import type { Address } from "viem";

export type TokenBucket = {
  tokens: bigint;
  lastUpdated: number;
  isEnabled: boolean;
  capacity: bigint;
  rate: bigint;
};

/** What one chain says about a route. On the source the bucket is outbound, on the destination inbound. */
export type RouteEndReads = {
  bridgeEnabled?: boolean;
  trustedRemote?: { remoteAddress: Address; isSet: boolean };
  gasLimit?: number;
  registeredPool?: Address;
  poolSupportsRemote?: boolean;
  /** Undefined on the mainnet lock/release pool, which has no such function. */
  poolEnabled?: boolean;
  bucket?: TokenBucket;
  failed: boolean;
};

export type RouteUnavailableReason =
  | "bridge-disabled"
  | "route-not-configured"
  | "pool-not-active"
  | "route-paused"
  | "unreachable";

export type RouteState =
  | { status: "loading" }
  | { status: "available" }
  | { status: "unavailable"; reason: RouteUnavailableReason };

export const ROUTE_UNAVAILABLE_COPY: Record<RouteUnavailableReason, string> = {
  "bridge-disabled": "Bridge is disabled",
  "route-not-configured": "Route isn't open yet",
  "pool-not-active": "Route isn't open yet",
  "route-paused": "Route is paused",
  unreachable: "Couldn't check this route",
};

/** The rate limiter config `CCIPTokenPoolConfig.disableChain` writes to contain a route. */
const DISABLED_CAPACITY = 2n;
const DISABLED_RATE = 1n;

function isContained(bucket: TokenBucket): boolean {
  return bucket.capacity === DISABLED_CAPACITY && bucket.rate === DISABLED_RATE;
}

function sameAddress(a: Address, b: Address): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

function checkEnd(
  end: RouteEndReads,
  remoteBridge: Address,
  localPool: Address,
  isLockRelease: boolean,
  requireGasLimit: boolean,
): RouteUnavailableReason | undefined {
  if (end.failed) return "unreachable";

  const { bridgeEnabled, trustedRemote, gasLimit, registeredPool, poolSupportsRemote, bucket } =
    end;
  if (
    bridgeEnabled === undefined ||
    trustedRemote === undefined ||
    gasLimit === undefined ||
    registeredPool === undefined ||
    poolSupportsRemote === undefined ||
    bucket === undefined ||
    (!isLockRelease && end.poolEnabled === undefined)
  ) {
    return "unreachable";
  }

  if (!bridgeEnabled) return "bridge-disabled";
  if (!trustedRemote.isSet || !sameAddress(trustedRemote.remoteAddress, remoteBridge)) {
    return "route-not-configured";
  }
  if (requireGasLimit && gasLimit === 0) return "route-not-configured";
  if (!poolSupportsRemote) return "route-not-configured";
  if (!sameAddress(registeredPool, localPool)) return "pool-not-active";
  if (!isLockRelease && !end.poolEnabled) return "pool-not-active";
  if (isContained(bucket)) return "route-paused";
  return undefined;
}

/**
 * Decides whether a route can deliver. It fails closed: anything unread or errored is
 * unavailable. Both ends are checked because the source can't see whether the destination is
 * ready, and a send to an unready destination strands the OHM.
 */
export function evaluateRoute({
  source,
  destination,
  expected,
  sourceIsLockRelease,
  destinationIsLockRelease,
  isLoading,
}: {
  source: RouteEndReads;
  destination: RouteEndReads;
  expected: {
    sourceBridge: Address;
    destinationBridge: Address;
    sourcePool: Address;
    destinationPool: Address;
  };
  sourceIsLockRelease: boolean;
  destinationIsLockRelease: boolean;
  isLoading: boolean;
}): RouteState {
  if (isLoading) return { status: "loading" };

  const reason =
    checkEnd(source, expected.destinationBridge, expected.sourcePool, sourceIsLockRelease, true) ??
    // The gas limit applies to sends, so the destination's own value for this lane is not needed.
    checkEnd(
      destination,
      expected.sourceBridge,
      expected.destinationPool,
      destinationIsLockRelease,
      false,
    );

  return reason ? { status: "unavailable", reason } : { status: "available" };
}
