import { parseUnits } from "viem";
import { mainnet, arbitrum, avalanche, polygon, fantom, optimism } from "@/lib/chains";
import type { MultiChainBalanceResult, ChainBalance } from "@/lib/hooks/useMultiChainBalance";

function bal(chainId: number, chainName: string, amount: string, decimals: number): ChainBalance {
  const balance = parseUnits(amount, decimals);
  return { chainId, chainName, balance, formattedBalance: amount };
}

function result(balances: ChainBalance[]): MultiChainBalanceResult {
  const totalBalance = balances.reduce((sum, b) => sum + b.balance, 0n);
  const totalFormatted = balances.reduce((sum, b) => sum + parseFloat(b.formattedBalance), 0);
  return {
    balances,
    totalBalance,
    formattedTotalBalance: totalFormatted.toString(),
    isLoading: false,
    error: null,
  };
}

const EMPTY: MultiChainBalanceResult = {
  balances: [],
  totalBalance: 0n,
  formattedTotalBalance: "0",
  isLoading: false,
  error: null,
};

// Whale: big balances across multiple chains
export const WHALE_BALANCES: Record<string, MultiChainBalanceResult> = {
  OHM: result([
    bal(mainnet.id, "Ethereum", "14.245", 9),
    bal(arbitrum.id, "Arbitrum One", "8.5", 9),
  ]),
  sOHM: result([bal(mainnet.id, "Ethereum", "2.125", 9)]),
  gOHM: result([
    bal(mainnet.id, "Ethereum", "14.245", 18),
    bal(arbitrum.id, "Arbitrum One", "3.8", 18),
    bal(polygon.id, "Polygon", "1.2", 18),
  ]),
  wsOHM: EMPTY,
  "OHM v1": EMPTY,
  "sOHM v1": EMPTY,
};

// Empty: connected but no balances
export const EMPTY_BALANCES: Record<string, MultiChainBalanceResult> = {
  OHM: EMPTY,
  sOHM: EMPTY,
  gOHM: EMPTY,
  wsOHM: EMPTY,
  "OHM v1": EMPTY,
  "sOHM v1": EMPTY,
};

// Legacy: wallet with old v1 tokens needing migration
export const LEGACY_BALANCES: Record<string, MultiChainBalanceResult> = {
  OHM: EMPTY,
  sOHM: EMPTY,
  gOHM: EMPTY,
  wsOHM: result([
    bal(mainnet.id, "Ethereum", "5.0", 18),
    bal(arbitrum.id, "Arbitrum One", "2.3", 18),
  ]),
  "OHM v1": result([bal(mainnet.id, "Ethereum", "125.0", 9)]),
  "sOHM v1": result([bal(mainnet.id, "Ethereum", "50.0", 9)]),
};

// Multi-chain: gOHM spread across many chains
export const MULTI_CHAIN_BALANCES: Record<string, MultiChainBalanceResult> = {
  OHM: result([bal(mainnet.id, "Ethereum", "5.0", 9)]),
  sOHM: EMPTY,
  gOHM: result([
    bal(mainnet.id, "Ethereum", "2.5", 18),
    bal(arbitrum.id, "Arbitrum One", "1.8", 18),
    bal(avalanche.id, "Avalanche", "0.75", 18),
    bal(polygon.id, "Polygon", "0.5", 18),
    bal(fantom.id, "Fantom Opera", "0.25", 18),
    bal(optimism.id, "OP Mainnet", "0.1", 18),
  ]),
  wsOHM: EMPTY,
  "OHM v1": EMPTY,
  "sOHM v1": EMPTY,
};
