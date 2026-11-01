import { mainnet, arbitrum, base, berachain, optimism, robinhood } from "@/lib/chains";
import type { IconName } from "@/components/icon";

/** CCIP chain selectors, from olympus-v3 src/scripts/env.json. */
export const CCIP_CHAIN_SELECTORS: Record<number, bigint> = {
  [mainnet.id]: 5009297550715157269n,
  [arbitrum.id]: 4949039107694359620n,
  [base.id]: 15971525489660198786n,
  [berachain.id]: 1294465214383781161n,
  [optimism.id]: 3734403246176062136n,
  [robinhood.id]: 6180753054346818345n,
};

export interface BridgeChain {
  chainId: number;
  name: string;
  icon: IconName;
  nativeCurrencySymbol: string;
}

export const BRIDGE_CHAINS: BridgeChain[] = [
  { chainId: mainnet.id, name: "Ethereum", icon: "EthereumChainIcon", nativeCurrencySymbol: "ETH" },
  {
    chainId: arbitrum.id,
    name: "Arbitrum",
    icon: "ArbitrumChainIcon",
    nativeCurrencySymbol: "ETH",
  },
  { chainId: base.id, name: "Base", icon: "BaseChainIcon", nativeCurrencySymbol: "ETH" },
  {
    chainId: berachain.id,
    name: "Berachain",
    icon: "BerachainChainIcon",
    nativeCurrencySymbol: "BERA",
  },
  {
    chainId: optimism.id,
    name: "Optimism",
    icon: "OptimismChainIcon",
    nativeCurrencySymbol: "ETH",
  },
  {
    chainId: robinhood.id,
    name: "Robinhood Chain",
    icon: "RobinhoodChainIcon",
    nativeCurrencySymbol: "ETH",
  },
];

/**
 * Which destination chains exist for each source chain. Chainlink serves no lane for
 * Optimism-Berachain, Robinhood-Optimism or Robinhood-Berachain. Whether a route is live is
 * decided on-chain by `useBridgeRoute`, not here.
 */
export const BRIDGEABLE_DESTINATIONS: Record<number, number[]> = {
  [mainnet.id]: [arbitrum.id, base.id, berachain.id, optimism.id, robinhood.id],
  [arbitrum.id]: [mainnet.id, base.id, berachain.id, optimism.id, robinhood.id],
  [base.id]: [mainnet.id, arbitrum.id, berachain.id, optimism.id, robinhood.id],
  [berachain.id]: [mainnet.id, arbitrum.id, base.id],
  [optimism.id]: [mainnet.id, arbitrum.id, base.id],
  [robinhood.id]: [mainnet.id, arbitrum.id, base.id],
};

/** Default destination chain for each source chain. */
export const DEFAULT_DESTINATION: Record<number, number> = {
  [mainnet.id]: arbitrum.id,
  [arbitrum.id]: mainnet.id,
  [base.id]: mainnet.id,
  [berachain.id]: mainnet.id,
  [optimism.id]: mainnet.id,
  [robinhood.id]: mainnet.id,
};

/** Ethereum locks and releases OHM; every other chain burns and mints it. */
export function isLockReleasePool(chainId: number): boolean {
  return chainId === mainnet.id;
}

export function getBridgeChain(chainId: number): BridgeChain | undefined {
  return BRIDGE_CHAINS.find((c) => c.chainId === chainId);
}

/** Check if a given chain ID supports bridging. */
export function isBridgeableChain(chainId: number): boolean {
  return chainId in BRIDGEABLE_DESTINATIONS;
}
