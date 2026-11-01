import { describe, expect, it } from "vitest";
import type { Address } from "viem";
import { evaluateRoute, type RouteEndReads, type TokenBucket } from "../routeState";

const SOURCE_BRIDGE = "0x00000000000000000000000000000000000000a1" as Address;
const DEST_BRIDGE = "0x00000000000000000000000000000000000000a2" as Address;
const SOURCE_POOL = "0x00000000000000000000000000000000000000b1" as Address;
const DEST_POOL = "0x00000000000000000000000000000000000000b2" as Address;
const OTHER = "0x00000000000000000000000000000000000000ff" as Address;

const bucket: TokenBucket = {
  tokens: 100_000_000_000_000n,
  lastUpdated: 1,
  isEnabled: true,
  capacity: 100_000_000_000_000n,
  rate: 1_157_407_407n,
};

const sourceEnd: RouteEndReads = {
  bridgeEnabled: true,
  trustedRemote: { remoteAddress: DEST_BRIDGE, isSet: true },
  gasLimit: 275_000,
  registeredPool: SOURCE_POOL,
  poolSupportsRemote: true,
  poolEnabled: true,
  bucket,
  failed: false,
};

const destEnd: RouteEndReads = {
  ...sourceEnd,
  trustedRemote: { remoteAddress: SOURCE_BRIDGE, isSet: true },
  registeredPool: DEST_POOL,
};

function evaluate(
  source: Partial<RouteEndReads> = {},
  destination: Partial<RouteEndReads> = {},
  overrides: { sourceIsLockRelease?: boolean; destinationIsLockRelease?: boolean } = {},
  isLoading = false,
) {
  return evaluateRoute({
    source: { ...sourceEnd, ...source },
    destination: { ...destEnd, ...destination },
    expected: {
      sourceBridge: SOURCE_BRIDGE,
      destinationBridge: DEST_BRIDGE,
      sourcePool: SOURCE_POOL,
      destinationPool: DEST_POOL,
    },
    sourceIsLockRelease: overrides.sourceIsLockRelease ?? false,
    destinationIsLockRelease: overrides.destinationIsLockRelease ?? false,
    isLoading,
  });
}

describe("evaluateRoute", () => {
  it("is available when all checks pass", () => {
    expect(evaluate()).toEqual({ status: "available" });
  });

  it("matches addresses regardless of case", () => {
    expect(
      evaluate({
        trustedRemote: {
          remoteAddress: DEST_BRIDGE.toUpperCase().replace("0X", "0x") as Address,
          isSet: true,
        },
      }),
    ).toEqual({ status: "available" });
  });

  it("returns loading while reads are in flight", () => {
    expect(evaluate({ bridgeEnabled: undefined }, {}, {}, true)).toEqual({ status: "loading" });
  });

  it.each([
    ["source bridge disabled", { bridgeEnabled: false }, {}, "bridge-disabled"],
    ["destination bridge disabled", {}, { bridgeEnabled: false }, "bridge-disabled"],
    [
      "source remote unset",
      { trustedRemote: { remoteAddress: DEST_BRIDGE, isSet: false } },
      {},
      "route-not-configured",
    ],
    [
      "source remote wrong",
      { trustedRemote: { remoteAddress: OTHER, isSet: true } },
      {},
      "route-not-configured",
    ],
    [
      "destination remote wrong",
      {},
      { trustedRemote: { remoteAddress: OTHER, isSet: true } },
      "route-not-configured",
    ],
    ["source gas limit zero", { gasLimit: 0 }, {}, "route-not-configured"],
    ["source pool lacks remote", { poolSupportsRemote: false }, {}, "route-not-configured"],
    ["destination pool lacks remote", {}, { poolSupportsRemote: false }, "route-not-configured"],
    ["source registry mismatch", { registeredPool: OTHER }, {}, "pool-not-active"],
    ["destination registry mismatch", {}, { registeredPool: OTHER }, "pool-not-active"],
    ["source pool disabled", { poolEnabled: false }, {}, "pool-not-active"],
    ["destination pool disabled", {}, { poolEnabled: false }, "pool-not-active"],
  ] as const)("%s is unavailable", (_name, source, destination, reason) => {
    expect(evaluate(source, destination)).toEqual({ status: "unavailable", reason });
  });

  it("does not require isEnabled on a lock/release pool", () => {
    expect(evaluate({ poolEnabled: undefined }, {}, { sourceIsLockRelease: true })).toEqual({
      status: "available",
    });
    expect(evaluate({}, { poolEnabled: undefined }, { destinationIsLockRelease: true })).toEqual({
      status: "available",
    });
  });

  it("treats the disableChain config (capacity 2, rate 1) as paused", () => {
    const contained = { ...bucket, tokens: 2n, capacity: 2n, rate: 1n };
    expect(evaluate({ bucket: contained })).toEqual({
      status: "unavailable",
      reason: "route-paused",
    });
    expect(evaluate({}, { bucket: contained })).toEqual({
      status: "unavailable",
      reason: "route-paused",
    });
  });

  it("fails closed when a read errors, on either end", () => {
    expect(evaluate({ failed: true })).toEqual({ status: "unavailable", reason: "unreachable" });
    expect(evaluate({}, { failed: true })).toEqual({
      status: "unavailable",
      reason: "unreachable",
    });
  });

  it.each([
    ["bridgeEnabled"],
    ["trustedRemote"],
    ["gasLimit"],
    ["registeredPool"],
    ["poolSupportsRemote"],
    ["poolEnabled"],
    ["bucket"],
  ] as const)("fails closed when %s is missing after loading", (field) => {
    expect(evaluate({ [field]: undefined })).toEqual({
      status: "unavailable",
      reason: "unreachable",
    });
  });
});
