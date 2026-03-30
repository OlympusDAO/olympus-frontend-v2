import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import { ContractName, getContractAddress } from "@/lib/contracts";
import { BRIDGE_CHAINS } from "@/modules/bridge/constants";
import { useMockData } from "@/lib/mock/provider";

export interface BridgeHistoryItem {
  srcChainId: number;
  dstChainId: number;
  timestamp: string;
  amount: string;
  srcTxHash: string;
  dstTxHash?: string;
  status: "DELIVERED" | "INFLIGHT" | "FAILED" | string;
}

// LayerZero v2 endpoint ID → EVM chain ID mapping
const LZ_EID_TO_EVM: Record<number, number> = {
  30101: 1, // Ethereum
  30110: 42161, // Arbitrum
  30184: 8453, // Base
  30362: 80094, // Berachain
};

function lzEidToEvmChainId(eid: number): number {
  return LZ_EID_TO_EVM[eid] ?? eid;
}

/**
 * Fetch bridge history from LayerZero Scan API.
 * Uses GET /v1/messages/wallet/{srcAddress} endpoint.
 */
export function useBridgeHistory() {
  const { address } = useAccount();
  const mock = useMockData();

  // Collect all bridge contract addresses for filtering
  const bridgeAddresses = BRIDGE_CHAINS.map((chain) =>
    getContractAddress(ContractName.CROSS_CHAIN_BRIDGE, chain.chainId),
  ).filter(Boolean);

  const { data, isLoading, error } = useQuery({
    queryKey: ["bridgeHistory", address],
    enabled: !mock && !!address && bridgeAddresses.length > 0,
    queryFn: async () => {
      const url = `https://scan.layerzero-api.com/v1/messages/wallet/${address}?limit=100`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`LayerZero API error: ${response.status}`);
      }

      const json = await response.json();
      const messages: LzMessage[] = json.data ?? [];

      // Filter to only our OHM bridge contract messages
      const bridgeAddressSet = new Set(bridgeAddresses.map((a) => a!.toLowerCase()));

      const items: BridgeHistoryItem[] = messages
        .filter((msg) => {
          const senderAddr = msg.pathway?.sender?.address?.toLowerCase();
          return senderAddr && bridgeAddressSet.has(senderAddr);
        })
        .map((msg) => {
          const srcChainId = lzEidToEvmChainId(msg.pathway.srcEid);
          const dstChainId = lzEidToEvmChainId(msg.pathway.dstEid);

          return {
            srcChainId,
            dstChainId,
            timestamp: msg.created,
            amount: parseAmountFromPayload(msg.source?.tx?.payload),
            srcTxHash: msg.source?.tx?.txHash ?? "",
            dstTxHash: msg.destination?.tx?.txHash ?? undefined,
            status: msg.status?.name ?? "INFLIGHT",
          } satisfies BridgeHistoryItem;
        });

      return items;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  if (mock?.scenario.bridge) {
    return {
      history: mock.scenario.bridge.history,
      isLoading: false,
      error: null,
    };
  }

  return {
    history: data ?? [],
    isLoading,
    error: error as Error | null,
  };
}

/**
 * Parse OHM amount from LayerZero message payload.
 * The bridge contract encodes: recipient address (20 bytes) + amount (uint256).
 * OHM has 9 decimals.
 */
function parseAmountFromPayload(payload?: string): string {
  if (!payload || payload.length < 66) return "0";
  try {
    // Skip the 0x prefix + first bytes (varies by encoding),
    // look for the amount in the payload.
    // OFT v1 payload format: abi.encode(address to, uint256 amount)
    // = 32 bytes (address padded) + 32 bytes (amount) = 64 hex chars each
    // After 0x prefix, that's positions 2..66 (address) and 66..130 (amount)
    const amountHex = `0x${payload.slice(66, 130)}`;
    const amount = BigInt(amountHex);
    if (amount === 0n) return "0";
    return formatUnits(amount, 9);
  } catch {
    return "0";
  }
}

// Type for LayerZero Scan API response messages
interface LzMessage {
  pathway: {
    srcEid: number;
    dstEid: number;
    sender: { address: string; id?: string; name?: string; chain?: string };
    receiver: { address: string; id?: string; name?: string; chain?: string };
    nonce: number;
  };
  source: {
    status: string;
    tx: {
      txHash: string;
      blockNumber: string;
      blockTimestamp: number;
      from: string;
      payload: string;
    };
  };
  destination?: {
    status?: string;
    tx?: {
      txHash: string;
      blockNumber?: string;
      blockTimestamp?: number;
    };
  };
  status: {
    name: string;
    message?: string;
  };
  guid: string;
  created: string;
  updated: string;
}
