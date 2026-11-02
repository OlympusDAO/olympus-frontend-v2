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
import { baseSepolia, berachain, robinhood } from "viem/chains";
import { http, type Transport } from "viem";
import ethereumIcon from "@/icons/chains/ethereum.svg";
import arbitrumIcon from "@/icons/chains/arbitrum.svg";
import baseIcon from "@/icons/chains/base.svg";
import berachainIcon from "@/icons/chains/berachain.svg";
import optimismIcon from "@/icons/chains/optimism.svg";
import robinhoodIcon from "@/icons/chains/robinhood.svg";
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
const optimismWithIcon = withIcon(optimism, optimismIcon);
const robinhoodWithIcon = withIcon(robinhood, robinhoodIcon);
const sepoliaWithIcon = withIcon(sepolia, sepoliaIcon);
const baseSepoliaWithIcon = withIcon(baseSepolia, baseIcon);

/**
 * Chains available in the wallet network selector.
 * Multi-chain balance lookups and bridging handle other chains independently.
 */
export const PRODUCTION_CHAINS = [mainnetWithIcon] as const;

/**
 * Additional chains needed for bridge chain switching.
 * Not shown in the default wallet network selector UI.
 */
export const BRIDGE_EXTRA_CHAINS = [
  arbitrumWithIcon,
  baseWithIcon,
  berachainWithIcon,
  optimismWithIcon,
  robinhoodWithIcon,
] as const;

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
  ? ([...PRODUCTION_CHAINS, ...BRIDGE_EXTRA_CHAINS, sepoliaWithIcon, baseSepoliaWithIcon] as const)
  : ([...PRODUCTION_CHAINS, ...BRIDGE_EXTRA_CHAINS] as const);

/**
 * In dev, VITE_<CHAIN>_RPC_URL points a chain at a local anvil fork (see scripts/fork-testing.md).
 * Each override is read inline behind `import.meta.env.DEV`, so the bundler drops it and a fork URL
 * lingering in a shared build env can never be baked into a production bundle. Holding
 * `import.meta.env` in a variable would defeat that.
 */
const devMainnetRpc = import.meta.env.DEV ? import.meta.env.VITE_MAINNET_RPC_URL : undefined;
const devArbitrumRpc = import.meta.env.DEV ? import.meta.env.VITE_ARBITRUM_RPC_URL : undefined;
const devOptimismRpc = import.meta.env.DEV ? import.meta.env.VITE_OPTIMISM_RPC_URL : undefined;
const devBaseRpc = import.meta.env.DEV ? import.meta.env.VITE_BASE_RPC_URL : undefined;
const devBerachainRpc = import.meta.env.DEV ? import.meta.env.VITE_BERACHAIN_RPC_URL : undefined;
const devRobinhoodRpc = import.meta.env.DEV ? import.meta.env.VITE_ROBINHOOD_RPC_URL : undefined;

/**
 * Custom RPC transports per chain.
 */
export const transports: Record<number, Transport> = {
  [mainnet.id]: http(devMainnetRpc || "https://ethereum-rpc.publicnode.com", { batch: true }),
  [arbitrum.id]: http(devArbitrumRpc || "https://arbitrum-rpc.publicnode.com"),
  [polygon.id]: http("https://polygon-bor-rpc.publicnode.com"),
  [optimism.id]: http(devOptimismRpc || "https://optimism-rpc.publicnode.com"),
  [avalanche.id]: http("https://avalanche-c-chain-rpc.publicnode.com"),
  [boba.id]: http("https://mainnet.boba.network"),
  [fantom.id]: http("https://fantom.drpc.org"),
  [base.id]: http(devBaseRpc || "https://base-rpc.publicnode.com"),
  [berachain.id]: http(devBerachainRpc || "https://berachain-rpc.publicnode.com"),
  [robinhood.id]: http(devRobinhoodRpc || "https://rpc.mainnet.chain.robinhood.com"),
  [sepolia.id]: http("https://ethereum-sepolia.publicnode.com"),
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
  robinhood,
  sepolia,
  baseSepolia,
};
