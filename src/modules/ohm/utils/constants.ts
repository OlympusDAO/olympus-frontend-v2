import { mainnet, arbitrum, base, berachain } from "@/lib/chains";
import type { IconName } from "@/components/icon";

/**
 * LayerZero chain ID mapping (EVM chain ID → LayerZero chain ID).
 * Used when calling the bridge contract's sendOhm and estimateSendFee.
 */
export const LAYER_ZERO_CHAIN_IDS: Record<number, number> = {
  [mainnet.id]: 101,
  [arbitrum.id]: 110,
  [base.id]: 184,
  [berachain.id]: 362,
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
];

/** Which destination chains are available from each source chain. */
export const BRIDGEABLE_DESTINATIONS: Record<number, number[]> = {
  [mainnet.id]: [arbitrum.id, base.id, berachain.id],
  [arbitrum.id]: [mainnet.id, base.id],
  [base.id]: [mainnet.id, arbitrum.id],
  [berachain.id]: [mainnet.id],
};

/** Default destination chain for each source chain. */
export const DEFAULT_DESTINATION: Record<number, number> = {
  [mainnet.id]: arbitrum.id,
  [arbitrum.id]: mainnet.id,
  [base.id]: mainnet.id,
  [berachain.id]: mainnet.id,
};

export function getBridgeChain(chainId: number): BridgeChain | undefined {
  return BRIDGE_CHAINS.find((c) => c.chainId === chainId);
}

/** Check if a given chain ID supports bridging. */
export function isBridgeableChain(chainId: number): boolean {
  return chainId in BRIDGEABLE_DESTINATIONS;
}
