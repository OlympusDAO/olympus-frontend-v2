import { describe, expect, it } from "vitest";
import { getAddress } from "viem";
import { arbitrum, base, berachain, mainnet, optimism, robinhood } from "@/lib/chains";
import { ContractName, getContractAddress } from "@/lib/contracts";
import { getTokenAddress, TokenName } from "@/lib/tokens";
import {
  BRIDGE_CHAINS,
  BRIDGEABLE_DESTINATIONS,
  CCIP_CHAIN_SELECTORS,
  DEFAULT_DESTINATION,
  isLockReleasePool,
} from "../constants";

const ALL = [mainnet.id, arbitrum.id, base.id, berachain.id, optimism.id, robinhood.id];

describe("CCIP bridge config", () => {
  it("lists six chains", () => {
    expect(BRIDGE_CHAINS.map((c) => c.chainId).sort()).toEqual([...ALL].sort());
  });

  it.each(ALL)("chain %i has a selector, contracts and an OHM address", (chainId) => {
    expect(CCIP_CHAIN_SELECTORS[chainId]).toBeTypeOf("bigint");
    expect(getContractAddress(ContractName.CCIP_BRIDGE, chainId)).toBeDefined();
    expect(getContractAddress(ContractName.CCIP_TOKEN_POOL, chainId)).toBeDefined();
    expect(getContractAddress(ContractName.CCIP_TOKEN_ADMIN_REGISTRY, chainId)).toBeDefined();
    expect(getTokenAddress(TokenName.OHM, chainId)).toBeDefined();
  });

  it("uses the Base selector from the deployment config", () => {
    expect(CCIP_CHAIN_SELECTORS[base.id]).toBe(15971525489660198786n);
  });

  it.each([
    [optimism.id, berachain.id],
    [robinhood.id, optimism.id],
    [robinhood.id, berachain.id],
  ])("has no lane between %i and %i in either direction", (a, b) => {
    expect(BRIDGEABLE_DESTINATIONS[a]).not.toContain(b);
    expect(BRIDGEABLE_DESTINATIONS[b]).not.toContain(a);
  });

  it("has symmetric routes", () => {
    for (const source of ALL) {
      for (const destination of BRIDGEABLE_DESTINATIONS[source]) {
        expect(BRIDGEABLE_DESTINATIONS[destination]).toContain(source);
      }
    }
  });

  it.each([mainnet.id, arbitrum.id, base.id])("chain %i reaches all five others", (chainId) => {
    expect([...BRIDGEABLE_DESTINATIONS[chainId]].sort()).toEqual(
      ALL.filter((id) => id !== chainId).sort(),
    );
  });

  it("gives every chain a default destination it can reach", () => {
    for (const chainId of ALL) {
      expect(BRIDGEABLE_DESTINATIONS[chainId]).toContain(DEFAULT_DESTINATION[chainId]);
    }
  });

  it.each(ALL)("chain %i has every bridge address in checksummed form", (chainId) => {
    const addresses = [
      getContractAddress(ContractName.CCIP_BRIDGE, chainId),
      getContractAddress(ContractName.CCIP_TOKEN_POOL, chainId),
      getContractAddress(ContractName.CCIP_TOKEN_ADMIN_REGISTRY, chainId),
      getTokenAddress(TokenName.OHM, chainId),
    ];
    for (const address of addresses) expect(address).toBe(getAddress(address as string));
  });

  it("treats only mainnet as a lock/release pool", () => {
    expect(ALL.filter(isLockReleasePool)).toEqual([mainnet.id]);
  });
});
