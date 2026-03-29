import type { MultiChainBalanceResult } from "@/lib/hooks/useMultiChainBalance";
import type { BridgeHistoryItem } from "@/lib/hooks/bridge/useBridgeHistory";

export type MockPrices = {
  ohmPrice: number;
  gohmPrice: number;
  currentIndex: number;
};

export type MockBalances = {
  [tokenSymbol: string]: MultiChainBalanceResult;
};

export type MockBridge = {
  isActive: boolean;
  /** Mock native fee in wei (bigint serialized as string for fixture convenience) */
  nativeFeeWei: string;
  history: BridgeHistoryItem[];
};

export type MockScenario = {
  name: string;
  description: string;
  isConnected: boolean;
  prices: MockPrices;
  balances: MockBalances;
  bridge?: MockBridge;
};

export type MockData = {
  scenario: MockScenario;
};
