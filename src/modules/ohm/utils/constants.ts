import {
  mainnet,
  arbitrum,
  optimism,
  base,
  berachain,
  sepolia,
  arbitrumSepolia,
  baseSepolia,
  isTestnetMode,
} from "@/lib/chains";
import type { IconName } from "@/components/icon";

/**
 * A chain participating in the LayerZero V2 OHM bridge mesh.
 * `eid` is the LayerZero V2 endpoint ID used by sendOhm / estimateSendFee / rate limits.
 * `isCanonical` marks the chain that tracks bridged supply (Ethereum / Sepolia).
 */
export interface BridgeChain {
  chainId: number;
  eid: number;
  name: string;
  icon: IconName;
  nativeCurrencySymbol: string;
  isCanonical: boolean;
}

/** Mainnet bridge mesh (LZ V2). Optimism is new in V2; every chain reaches every other. */
const MAINNET_BRIDGE_NETWORKS: BridgeChain[] = [
  {
    chainId: mainnet.id,
    eid: 30101,
    name: "Ethereum",
    icon: "EthereumChainIcon",
    nativeCurrencySymbol: "ETH",
    isCanonical: true,
  },
  {
    chainId: arbitrum.id,
    eid: 30110,
    name: "Arbitrum",
    icon: "ArbitrumChainIcon",
    nativeCurrencySymbol: "ETH",
    isCanonical: false,
  },
  {
    chainId: optimism.id,
    eid: 30111,
    name: "Optimism",
    icon: "OptimismChainIcon",
    nativeCurrencySymbol: "ETH",
    isCanonical: false,
  },
  {
    chainId: base.id,
    eid: 30184,
    name: "Base",
    icon: "BaseChainIcon",
    nativeCurrencySymbol: "ETH",
    isCanonical: false,
  },
  {
    chainId: berachain.id,
    eid: 30362,
    name: "Berachain",
    icon: "BerachainChainIcon",
    nativeCurrencySymbol: "BERA",
    isCanonical: false,
  },
];

/** Testnet bridge mesh. Matches the LZ V2 testnet deployment (no Optimism testnet). */
const TESTNET_BRIDGE_NETWORKS: BridgeChain[] = [
  {
    chainId: sepolia.id,
    eid: 40161,
    name: "Sepolia",
    icon: "EthereumChainIcon",
    nativeCurrencySymbol: "ETH",
    isCanonical: true,
  },
  {
    chainId: arbitrumSepolia.id,
    eid: 40231,
    name: "Arbitrum Sepolia",
    icon: "ArbitrumChainIcon",
    nativeCurrencySymbol: "ETH",
    isCanonical: false,
  },
  {
    chainId: baseSepolia.id,
    eid: 40245,
    name: "Base Sepolia",
    icon: "BaseChainIcon",
    nativeCurrencySymbol: "ETH",
    isCanonical: false,
  },
];

/** Every known bridge chain across both environments, for env-agnostic lookups (e.g. history). */
export const ALL_BRIDGE_NETWORKS: BridgeChain[] = [
  ...MAINNET_BRIDGE_NETWORKS,
  ...TESTNET_BRIDGE_NETWORKS,
];

/** The active bridge mesh for the current environment. */
export const BRIDGE_NETWORKS: BridgeChain[] = isTestnetMode
  ? TESTNET_BRIDGE_NETWORKS
  : MAINNET_BRIDGE_NETWORKS;

/** Chains shown in the bridge UI selectors. */
export const BRIDGE_CHAINS: BridgeChain[] = BRIDGE_NETWORKS;

/** EVM chain ID → LayerZero V2 endpoint ID (active environment). */
export function chainIdToEid(chainId: number): number | undefined {
  return BRIDGE_NETWORKS.find((c) => c.chainId === chainId)?.eid;
}

/** LayerZero V2 endpoint ID → EVM chain ID (across all environments). */
export function eidToChainId(eid: number): number | undefined {
  return ALL_BRIDGE_NETWORKS.find((c) => c.eid === eid)?.chainId;
}

/** Full mesh: every chain can bridge to every other chain in the active environment. */
export const BRIDGEABLE_DESTINATIONS: Record<number, number[]> = Object.fromEntries(
  BRIDGE_NETWORKS.map((chain) => [
    chain.chainId,
    BRIDGE_NETWORKS.filter((other) => other.chainId !== chain.chainId).map(
      (other) => other.chainId,
    ),
  ]),
);

/** Default destination chain for each source chain (first other chain in the mesh). */
export const DEFAULT_DESTINATION: Record<number, number> = Object.fromEntries(
  BRIDGE_NETWORKS.map((chain) => [
    chain.chainId,
    BRIDGE_NETWORKS.find((other) => other.chainId !== chain.chainId)?.chainId ?? chain.chainId,
  ]),
);

export function getBridgeChain(chainId: number): BridgeChain | undefined {
  // Resolve across all environments so history rows render even when a row's chain
  // isn't in the active mesh.
  return ALL_BRIDGE_NETWORKS.find((c) => c.chainId === chainId);
}

/** Check if a given chain ID supports bridging in the active environment. */
export function isBridgeableChain(chainId: number): boolean {
  return chainId in BRIDGEABLE_DESTINATIONS;
}

/** The canonical (bridged-supply-tracking) chain ID for the active environment. */
export function getCanonicalChainId(): number | undefined {
  return BRIDGE_NETWORKS.find((c) => c.isCanonical)?.chainId;
}

/**
 * LayerZero Scan API base. Testnet messages live on a separate host from mainnet —
 * querying the wrong one returns no data.
 */
export const LZ_SCAN_API_BASE = isTestnetMode
  ? "https://scan-testnet.layerzero-api.com/v1"
  : "https://scan.layerzero-api.com/v1";

/** LayerZero Scan UI base, for linking users to the cross-chain message. */
export const LZ_SCAN_UI_BASE = isTestnetMode
  ? "https://testnet.layerzeroscan.com"
  : "https://layerzeroscan.com";

/** Link to a bridge message on LayerZero Scan, keyed by the source transaction hash. */
export function getLayerZeroScanTxUrl(txHash: string): string {
  return `${LZ_SCAN_UI_BASE}/tx/${txHash}`;
}
