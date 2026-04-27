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
import ethereumIcon from "@/icons/chains/ethereum.svg";
import arbitrumIcon from "@/icons/chains/arbitrum.svg";
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
const baseWithIcon = withIcon(base, baseIcon);
const berachainWithIcon = withIcon(berachain, berachainIcon);
const sepoliaWithIcon = withIcon(sepolia, sepoliaIcon);

/**
 * Chains available in the wallet network selector.
 * Multi-chain balance lookups and bridging handle other chains independently.
 */
export const PRODUCTION_CHAINS = [mainnetWithIcon] as const;

/**
 * Additional chains needed for bridge chain switching.
 * Not shown in the default wallet network selector UI.
 */
export const BRIDGE_EXTRA_CHAINS = [arbitrumWithIcon, baseWithIcon, berachainWithIcon] as const;

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
 */
export const allChains = isTestnetMode
  ? ([...PRODUCTION_CHAINS, ...BRIDGE_EXTRA_CHAINS, sepoliaWithIcon] as const)
  : ([...PRODUCTION_CHAINS, ...BRIDGE_EXTRA_CHAINS] as const);

/**
 * Custom RPC transports per chain.
 */
export const transports: Record<number, Transport> = {
  [mainnet.id]: http("https://ethereum-rpc.publicnode.com"),
  [arbitrum.id]: http("https://arbitrum-rpc.publicnode.com"),
  [polygon.id]: http("https://polygon-bor-rpc.publicnode.com"),
  [optimism.id]: http("https://optimism-rpc.publicnode.com"),
  [avalanche.id]: http("https://avalanche-c-chain-rpc.publicnode.com"),
  [boba.id]: http("https://mainnet.boba.network"),
  [fantom.id]: http("https://fantom.drpc.org"),
  [base.id]: http("https://base-rpc.publicnode.com"),
  [berachain.id]: http("https://berachain-rpc.publicnode.com"),
  [sepolia.id]: http("https://ethereum-sepolia.publicnode.com"),
};

// Re-export chain objects for convenience
export { mainnet, arbitrum, polygon, optimism, avalanche, boba, fantom, base, berachain, sepolia };
