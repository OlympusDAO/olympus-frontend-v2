// The Graph Gateway API key
const SUBGRAPH_API_KEY = import.meta.env.VITE_THEGRAPH_API_KEY as string;
const graphUrl = (id: string) =>
  `https://gateway.thegraph.com/api/${SUBGRAPH_API_KEY}/subgraphs/id/${id}`;

// Subgraph & API endpoints
export const CD_SUBGRAPH_URL = "https://olympus-convertible-deposits-indexer.up.railway.app";
export const COOLER_SUBGRAPH_URL = graphUrl("4Vicyh7DiEGj6aSamLpAhwydcnaU1CPQgvWApWv7H9Rh");
export const YRF_SUBGRAPH_URL = graphUrl("BVcdoUHemeVF5qmbvgLvHqLKH2oNouwJBuZXBVwdyNLe");
export const BOND_SUBGRAPH_URL = graphUrl("E4Mikyz3ec1MGGFYNuEDQ3F1qtcLashFKwyTvnbfa9Ss");
export const EMISSION_MANAGER_SUBGRAPH_URL = graphUrl(
  "7KwoppR1FTbHpz7VieAEFmyyPh9z2ZWUvYjSs5w3cTV8",
);
export const DEFILLAMA_YIELDS_URL = "https://yields.llama.fi";
export const KODIAK_API_URL = "https://backend.kodiak.finance";
export const ETHERSCAN_BASE_URL = "https://etherscan.io";

// DeFiLlama Pool IDs for yield-bearing reserves
export const DEFILLAMA_POOLS = {
  SUSDE: "66985a81-9c51-46ca-9977-42b4fe7bc6df",
  SUSDS: "d8c4eff5-c8a9-46fc-a888-057c4c668e72",
} as const;

// Map treasury tokenRecord LP names → DeFiLlama pool IDs (for fee APY lookup).
// Keys must match Envio's exact token strings — verified via TokenRecord query.
export const LP_POOL_MAP: Record<string, string> = {
  "UniswapV3 OHM-sUSDS": "0cc155d9-0e7f-4bdd-b07e-0a09e34b9af0",
  "UniswapV3 WETH-OHM": "dea7e764-1c6a-4d51-bb35-5f428fc85b57",
  "UniswapV3 OHM-USDC Liquidity Pool": "56772e92-32e2-47a5-9611-1626eaf92826",
  "Camelot OHM-wETH Liquidity Pool": "d1a3947b-c4c8-4ca3-80d9-c91a5decbc9e",
};

// Map treasury tokenRecord LP names → Kodiak vault addresses (for fee APR lookup)
export const KODIAK_VAULT_MAP: Record<string, string> = {
  "Beradrome Kodiak OHM-HONEY LP": "0x98bdeede9a45c28d229285d9d6e9139e9f505391",
};

// Protocol Constants
export const COOLER_APR = 0.005; // 0.5% APR
export const EPOCH_DURATION_HOURS = 8;
export const EPOCHS_PER_WEEK = 21; // 3 per day * 7 days
