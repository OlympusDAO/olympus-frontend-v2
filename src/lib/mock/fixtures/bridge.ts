import type { MockBridge } from "../types";
import type { BridgeHistoryItem } from "@/lib/hooks/bridge/useBridgeHistory";

const now = Date.now();
const HOUR = 3_600_000;
const DAY = 86_400_000;

const MOCK_HISTORY: BridgeHistoryItem[] = [
  {
    source: "ccip",
    srcChainId: 1,
    dstChainId: 42161,
    timestamp: new Date(now - 2 * HOUR).toISOString(),
    amount: "25.5",
    srcTxHash: "0xabc123def456789012345678901234567890abcdef1234567890abcdef123456",
    dstTxHash: "0xdef456abc789012345678901234567890abcdef1234567890abcdef123456abc",
    status: "DELIVERED",
  },
  {
    source: "ccip",
    srcChainId: 42161,
    dstChainId: 8453,
    timestamp: new Date(now - 6 * HOUR).toISOString(),
    amount: "10.0",
    srcTxHash: "0x111222333444555666777888999000aaabbbcccdddeeefffaaabbbccc111222",
    status: "INFLIGHT",
  },
  {
    source: "ccip",
    srcChainId: 8453,
    dstChainId: 1,
    timestamp: new Date(now - 1 * DAY).toISOString(),
    amount: "78.23",
    srcTxHash: "0xaaa111bbb222ccc333ddd444eee555fff666777888999000aaabbbccc111222",
    dstTxHash: "0xbbb222ccc333ddd444eee555fff666777888999000aaabbbccc111222aaa111",
    status: "DELIVERED",
  },
  {
    source: "ccip",
    srcChainId: 1,
    dstChainId: 80094,
    timestamp: new Date(now - 2 * DAY).toISOString(),
    amount: "5.0",
    srcTxHash: "0xccc333ddd444eee555fff666777888999000aaabbbccc111222aaa111bbb222",
    dstTxHash: "0xddd444eee555fff666777888999000aaabbbccc111222aaa111bbb222ccc333",
    status: "DELIVERED",
  },
  {
    source: "ccip",
    srcChainId: 80094,
    dstChainId: 42161,
    timestamp: new Date(now - 3 * DAY).toISOString(),
    amount: "12.75",
    srcTxHash: "0xeee555fff666777888999000aaabbbccc111222aaa111bbb222ccc333ddd444",
    status: "FAILED",
  },
];

export const BRIDGE_ACTIVE: MockBridge = {
  routes: "available",
  nativeFeeWei: "350000000000000", // ~0.00035 ETH
  history: MOCK_HISTORY,
};

export const BRIDGE_INACTIVE: MockBridge = {
  routes: "unavailable",
  nativeFeeWei: "0",
  history: [],
};

export const BRIDGE_ROUTE_PAUSED: MockBridge = {
  ...BRIDGE_ACTIVE,
  routes: "route-paused",
};

// A 100 OHM route limit, so the near-limit and over-limit states are reachable by typing an amount.
export const BRIDGE_NEAR_LIMIT: MockBridge = {
  ...BRIDGE_ACTIVE,
  outboundTokens: "100000000000",
  inboundTokens: "110000000000",
  poolLiquidity: "130000000000",
};
