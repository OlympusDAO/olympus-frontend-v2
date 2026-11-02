import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SEPOLIA = 11155111;
const BASE_SEPOLIA = 84532;

async function load() {
  vi.resetModules();
  const constants = await import("../constants");
  const contracts = await import("@/lib/contracts");
  const tokens = await import("@/lib/tokens");
  const safeFee = await import("@/lib/hooks/bridge/safeFee");
  const safeService = await import("@/lib/hooks/bridge/safeService");
  return { ...constants, ...contracts, ...tokens, ...safeFee, ...safeService };
}

describe("bridge config in testnet mode", () => {
  beforeEach(() => vi.stubEnv("VITE_TESTNET_MODE", "true"));
  afterEach(() => vi.unstubAllEnvs());

  it("offers Sepolia and Base Sepolia as a route", async () => {
    const { BRIDGEABLE_DESTINATIONS, BRIDGE_CHAINS } = await load();
    expect(BRIDGEABLE_DESTINATIONS[SEPOLIA]).toEqual([BASE_SEPOLIA]);
    expect(BRIDGEABLE_DESTINATIONS[BASE_SEPOLIA]).toEqual([SEPOLIA]);
    expect(BRIDGE_CHAINS.map((c) => c.chainId)).toEqual(
      expect.arrayContaining([SEPOLIA, BASE_SEPOLIA]),
    );
  });

  it("has selectors, contracts and OHM for both", async () => {
    const m = await load();
    expect(m.CCIP_CHAIN_SELECTORS[SEPOLIA]).toBe(16015286601757825753n);
    expect(m.CCIP_CHAIN_SELECTORS[BASE_SEPOLIA]).toBe(10344971235874465080n);
    for (const chainId of [SEPOLIA, BASE_SEPOLIA]) {
      expect(m.getContractAddress(m.ContractName.CCIP_BRIDGE, chainId)).toBeDefined();
      expect(m.getContractAddress(m.ContractName.CCIP_TOKEN_POOL, chainId)).toBeDefined();
      expect(m.getContractAddress(m.ContractName.CCIP_TOKEN_ADMIN_REGISTRY, chainId)).toBeDefined();
      expect(m.getTokenAddress(m.TokenName.OHM, chainId)).toBeDefined();
    }
  });

  it("treats Sepolia as the lock/release chain, like mainnet", async () => {
    const { isLockReleasePool, getLiquidityPool, getSafeFee } = await load();
    expect(isLockReleasePool(SEPOLIA)).toBe(true);
    expect(isLockReleasePool(BASE_SEPOLIA)).toBe(false);
    expect(getLiquidityPool(SEPOLIA)).toEqual({
      pool: "0xF166375E8Ee42565F93e244C606b8c09b9F67dbc",
      ohm: "0x784cA0C006b8651BAB183829A99fA46BeCe50dBc",
    });
    expect(getLiquidityPool(BASE_SEPOLIA)).toBeUndefined();
    expect(getSafeFee(100n, SEPOLIA).value).toBe(400n);
  });

  it("knows the Safe service for both", async () => {
    const { SAFE_SERVICE_SLUGS } = await load();
    expect(SAFE_SERVICE_SLUGS[SEPOLIA]).toBe("sep");
    expect(SAFE_SERVICE_SLUGS[BASE_SEPOLIA]).toBe("basesep");
  });
});

describe("bridge config in production", () => {
  it("leaves the testnets out", async () => {
    vi.stubEnv("VITE_TESTNET_MODE", "");
    const { BRIDGEABLE_DESTINATIONS, BRIDGE_CHAINS, getLiquidityPool } = await load();
    expect(BRIDGEABLE_DESTINATIONS[SEPOLIA]).toBeUndefined();
    expect(BRIDGE_CHAINS.map((c) => c.chainId)).not.toContain(BASE_SEPOLIA);
    expect(getLiquidityPool(1)?.pool).toBe("0xa5588e518CE5ee0e4628C005E4edAbD5e87de3aD");
    vi.unstubAllEnvs();
  });
});
