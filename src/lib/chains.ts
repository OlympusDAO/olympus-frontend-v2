import {
  mainnet,
  arbitrum,
  polygon,
  optimism,
  avalanche,
  boba,
  fantom,
  base,
  sepolia,
} from "viem/chains";
import { berachain } from "viem/chains";
import { http, type Transport } from "viem";

/**
 * All production chains supported by Olympus.
 */
export const PRODUCTION_CHAINS = [
  mainnet,
  arbitrum,
  polygon,
  optimism,
  avalanche,
  boba,
  fantom,
  base,
  berachain,
] as const;

/**
 * Testnet chains (sepolia only).
 */
export const TESTNET_CHAINS = [sepolia] as const;

/**
 * Whether testnet mode is enabled via environment variable.
 */
export const isTestnetMode = Boolean(import.meta.env.VITE_TESTNET_MODE);

/**
 * Active chains based on testnet mode.
 */
export const activeChains = isTestnetMode ? TESTNET_CHAINS : PRODUCTION_CHAINS;

/**
 * Custom RPC transports per chain.
 */
export const transports: Record<number, Transport> = {
  [mainnet.id]: http("https://ethereum-rpc.publicnode.com"),
  [arbitrum.id]: http("https://arbitrum.drpc.org"),
  [polygon.id]: http("https://polygon.drpc.org"),
  [optimism.id]: http("https://optimism.drpc.org"),
  [avalanche.id]: http("https://avalanche.drpc.org"),
  [boba.id]: http("https://mainnet.boba.network"),
  [fantom.id]: http("https://fantom.drpc.org"),
  [base.id]: http("https://base.drpc.org"),
  [berachain.id]: http("https://rpc.berachain.com"),
  [sepolia.id]: http("https://ethereum-sepolia.publicnode.com"),
};

// Re-export chain objects for convenience
export {
  mainnet,
  arbitrum,
  polygon,
  optimism,
  avalanche,
  boba,
  fantom,
  base,
  berachain,
  sepolia,
};
