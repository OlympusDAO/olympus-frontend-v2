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
  arbitrumSepolia,
  baseSepolia,
} from "viem/chains";
import { berachain } from "viem/chains";
import { http, type Transport } from "viem";
import ethereumIcon from "@/icons/chains/ethereum.svg";
import arbitrumIcon from "@/icons/chains/arbitrum.svg";
import optimismIcon from "@/icons/chains/optimism.svg";
import baseIcon from "@/icons/chains/base.svg";
import berachainIcon from "@/icons/chains/berachain.svg";
import sepoliaIcon from "@/icons/chains/sepolia.svg";

const withIcon = <T extends { id: number }>(chain: T, iconUrl: string) => ({
  ...chain,
  iconUrl,
  iconBackground: "transparent",
});

const mainnetWithIcon = withIcon(mainnet, ethereumIcon);
const arbitrumWithIcon = withIcon(arbitrum, arbitrumIcon);
const optimismWithIcon = withIcon(optimism, optimismIcon);
const baseWithIcon = withIcon(base, baseIcon);
const berachainWithIcon = withIcon(berachain, berachainIcon);
const sepoliaWithIcon = withIcon(sepolia, sepoliaIcon);
// Testnet bridge chains reuse their mainnet icons.
const arbitrumSepoliaWithIcon = withIcon(arbitrumSepolia, arbitrumIcon);
const baseSepoliaWithIcon = withIcon(baseSepolia, baseIcon);

/**
 * Chains available in the wallet network selector.
 * Multi-chain balance lookups and bridging handle other chains independently.
 */
export const PRODUCTION_CHAINS = [mainnetWithIcon] as const;

/**
 * Additional chains needed for bridge chain switching (mainnet full mesh).
 * Not shown in the default wallet network selector UI.
 */
export const BRIDGE_EXTRA_CHAINS = [
  arbitrumWithIcon,
  optimismWithIcon,
  baseWithIcon,
  berachainWithIcon,
] as const;

/**
 * Testnet bridge chains added alongside Sepolia in testnet mode (full mesh).
 */
export const BRIDGE_TESTNET_CHAINS = [arbitrumSepoliaWithIcon, baseSepoliaWithIcon] as const;

/**
 * Whether testnet mode is enabled via environment variable.
 */
export const isTestnetMode = Boolean(import.meta.env.VITE_TESTNET_MODE);

/**
 * Active chains based on testnet mode.
 * In testnet mode, Sepolia is added alongside production chains rather than replacing them.
 */
export const activeChains = isTestnetMode
  ? ([...PRODUCTION_CHAINS, sepoliaWithIcon] as const)
  : PRODUCTION_CHAINS;

/**
 * All chains for the wagmi config (includes bridge chains for useSwitchChain).
 * In testnet mode the testnet bridge mesh (Sepolia + Arb/Base Sepolia) is added.
 */
export const allChains = isTestnetMode
  ? ([
      ...PRODUCTION_CHAINS,
      ...BRIDGE_EXTRA_CHAINS,
      sepoliaWithIcon,
      ...BRIDGE_TESTNET_CHAINS,
    ] as const)
  : ([...PRODUCTION_CHAINS, ...BRIDGE_EXTRA_CHAINS] as const);

/**
 * Custom RPC transports per chain.
 */
export const transports: Record<number, Transport> = {
  [mainnet.id]: http("https://ethereum-rpc.publicnode.com", { batch: true }),
  [arbitrum.id]: http("https://arbitrum-rpc.publicnode.com"),
  [polygon.id]: http("https://polygon-bor-rpc.publicnode.com"),
  [optimism.id]: http("https://optimism-rpc.publicnode.com"),
  [avalanche.id]: http("https://avalanche-c-chain-rpc.publicnode.com"),
  [boba.id]: http("https://mainnet.boba.network"),
  [fantom.id]: http("https://fantom.drpc.org"),
  [base.id]: http("https://base-rpc.publicnode.com"),
  [berachain.id]: http("https://berachain-rpc.publicnode.com"),
  [sepolia.id]: http("https://ethereum-sepolia.publicnode.com"),
  [arbitrumSepolia.id]: http("https://arbitrum-sepolia-rpc.publicnode.com"),
  [baseSepolia.id]: http("https://base-sepolia-rpc.publicnode.com"),
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
  arbitrumSepolia,
  baseSepolia,
};
