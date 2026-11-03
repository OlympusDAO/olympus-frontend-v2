import { describe, expect, it } from "vitest";
import { isRouteReady, parseRpcOverrides } from "../ccip-fork-setup";

describe("parseRpcOverrides", () => {
  it("keeps every = after the first, as in a keyed URL", () => {
    expect(
      parseRpcOverrides("mainnet=https://host/path?key=abc&x=1,base=http://localhost:1"),
    ).toEqual({
      mainnet: "https://host/path?key=abc&x=1",
      base: "http://localhost:1",
    });
  });

  it("is empty with no overrides", () => {
    expect(parseRpcOverrides(undefined)).toEqual({});
  });
});

describe("isRouteReady", () => {
  const remote = "0x00000000000000000000000000000000000000a2" as const;
  const pool = "0x00000000000000000000000000000000000000b1" as const;
  const bucket = { capacity: 100_000n, rate: 10n };
  const ready = {
    bridgeEnabled: true,
    trustedRemote: { remoteAddress: remote, isSet: true },
    expectedRemote: remote,
    gasLimit: 275_000,
    registeredPool: pool,
    expectedPool: pool,
    poolSupportsRemote: true,
    poolEnabled: true,
    outbound: bucket,
    inbound: bucket,
  };

  it("is ready when every frontend check passes", () => {
    expect(isRouteReady(ready)).toBe(true);
  });

  it("doesn't need isEnabled on the lock/release pool", () => {
    expect(isRouteReady({ ...ready, poolEnabled: undefined })).toBe(true);
  });

  it.each([
    ["a disabled L2 pool", { poolEnabled: false }],
    ["a contained outbound bucket", { outbound: { capacity: 2n, rate: 1n } }],
    ["a contained inbound bucket", { inbound: { capacity: 2n, rate: 1n } }],
    ["a disabled bridge", { bridgeEnabled: false }],
    ["an unset remote", { trustedRemote: { remoteAddress: remote, isSet: false } }],
    ["a wrong gas limit", { gasLimit: 0 }],
    ["an unregistered pool", { registeredPool: remote }],
    ["a pool without the route", { poolSupportsRemote: false }],
  ])("isn't ready with %s", (_name, change) => {
    expect(isRouteReady({ ...ready, ...change })).toBe(false);
  });
});
