// The Graph Gateway API key
const SUBGRAPH_API_KEY = import.meta.env.VITE_THEGRAPH_API_KEY as string;
const graphUrl = (id: string) =>
  `https://gateway.thegraph.com/api/${SUBGRAPH_API_KEY}/subgraphs/id/${id}`;

// Subgraph & API endpoints
export const CD_SUBGRAPH_URL =
  "https://olympus-convertible-deposits-indexer.up.railway.app";
export const COOLER_SUBGRAPH_URL = graphUrl("4Vicyh7DiEGj6aSamLpAhwydcnaU1CPQgvWApWv7H9Rh");
export const YRF_SUBGRAPH_URL = graphUrl("BVcdoUHemeVF5qmbvgLvHqLKH2oNouwJBuZXBVwdyNLe");
export const BOND_SUBGRAPH_URL = graphUrl("E4Mikyz3ec1MGGFYNuEDQ3F1qtcLashFKwyTvnbfa9Ss");
export const EMISSION_MANAGER_SUBGRAPH_URL = graphUrl("7KwoppR1FTbHpz7VieAEFmyyPh9z2ZWUvYjSs5w3cTV8");
export const TREASURY_API_URL =
  "https://olympus-treasury-subgraph-prod.web.app";
export const DEFILLAMA_YIELDS_URL = "https://yields.llama.fi";
export const ETHERSCAN_BASE_URL = "https://etherscan.io";

// Olympus App URLs
export const CD_APP_URL = "https://deposit.olympusdao.finance";
export const COOLER_APP_URL = "https://app.olympusdao.finance/#/lending";

// DeFiLlama Pool IDs for yield-bearing reserves
export const DEFILLAMA_POOLS = {
  SUSDE: "66985a81-9c51-46ca-9977-42b4fe7bc6df",
  SUSDS: "d8c4eff5-c8a9-46fc-a888-057c4c668e72",
} as const;

// Map treasury tokenRecord LP names → DeFiLlama pool IDs (for fee APY lookup)
export const LP_POOL_MAP: Record<string, string> = {
  "Uniswap V3 OHM-sUSDS Liquidity Pool": "0cc155d9-0e7f-4bdd-b07e-0a09e34b9af0",
  "Uniswap V3 wETH-OHM Liquidity Pool": "dea7e764-1c6a-4d51-bb35-5f428fc85b57",
  "Uniswap V3 OHM-USDC LP": "56772e92-32e2-47a5-9611-1626eaf92826",
  "Camelot OHM-wETH Liquidity Pool": "d1a3947b-c4c8-4ca3-80d9-c91a5decbc9e",
  "Beradrome Kodiak OHM-HONEY LP": "a20cd58b-2b22-4adc-874c-75ced1614aae",
};

// Protocol Constants
export const COOLER_APR = 0.005; // 0.5% APR
export const EPOCH_DURATION_HOURS = 8;
export const EPOCHS_PER_WEEK = 21; // 3 per day * 7 days
