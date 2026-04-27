import type { MockScenario } from "./types";
import { DEFAULT_PRICES } from "./fixtures/prices";
import {
  WHALE_BALANCES,
  EMPTY_BALANCES,
  LEGACY_BALANCES,
  MULTI_CHAIN_BALANCES,
} from "./fixtures/balances";
import { BRIDGE_ACTIVE, BRIDGE_INACTIVE } from "./fixtures/bridge";

export const SCENARIOS: Record<string, MockScenario> = {
  whale: {
    name: "whale",
    description: "Large OHM + gOHM balances across multiple chains",
    isConnected: true,
    prices: DEFAULT_PRICES,
    balances: WHALE_BALANCES,
    bridge: BRIDGE_ACTIVE,
  },
  empty: {
    name: "empty",
    description: "Connected wallet with zero balances",
    isConnected: true,
    prices: DEFAULT_PRICES,
    balances: EMPTY_BALANCES,
    bridge: { ...BRIDGE_ACTIVE, history: [] },
  },
  legacy: {
    name: "legacy",
    description: "Wallet with v1 OHM, v1 sOHM, wsOHM needing migration",
    isConnected: true,
    prices: DEFAULT_PRICES,
    balances: LEGACY_BALANCES,
  },
  "multi-chain": {
    name: "multi-chain",
    description: "gOHM spread across 6 chains",
    isConnected: true,
    prices: DEFAULT_PRICES,
    balances: MULTI_CHAIN_BALANCES,
    bridge: BRIDGE_ACTIVE,
  },
  bridge: {
    name: "bridge",
    description: "Bridge testing with OHM balances and transaction history",
    isConnected: true,
    prices: DEFAULT_PRICES,
    balances: WHALE_BALANCES,
    bridge: BRIDGE_ACTIVE,
  },
  "bridge-inactive": {
    name: "bridge-inactive",
    description: "Bridge disabled state",
    isConnected: true,
    prices: DEFAULT_PRICES,
    balances: WHALE_BALANCES,
    bridge: BRIDGE_INACTIVE,
  },
  disconnected: {
    name: "disconnected",
    description: "No wallet connected",
    isConnected: false,
    prices: DEFAULT_PRICES,
    balances: EMPTY_BALANCES,
  },
};

export function getScenarioFromUrl(): MockScenario {
  const params = new URLSearchParams(window.location.search);
  // Also check hash params for hash-based routing
  const hashSearch = window.location.hash.split("?")[1];
  const hashParams = hashSearch ? new URLSearchParams(hashSearch) : null;

  const scenarioName = params.get("scenario") ?? hashParams?.get("scenario") ?? "whale";

  return SCENARIOS[scenarioName] ?? SCENARIOS.whale;
}
