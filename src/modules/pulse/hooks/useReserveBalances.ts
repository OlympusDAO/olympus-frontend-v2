import { useQuery } from "@tanstack/react-query";
import {
  fetchTreasuryAssets,
  filterLatestSnapshotPerChain,
  parseEnvioNumber,
} from "@/lib/utils/envio";

export interface LpPosition {
  name: string;
  displayName: string;
  blockchain: string;
  value: number;
  valueExcludingOhm: number;
}

export interface ReserveHolding {
  token: string;
  tokenAddress?: string;
  contractName?: string;
  blockchain: string;
  category: string;
  balance: number;
  value: number;
  isLiquid: boolean;
  backingContribution: number;
}

interface ReserveBalances {
  susdeValue: number;
  susdsValue: number;
  lpPositions: LpPosition[];
  holdings: ReserveHolding[];
}

// 30 days — cross-chain indexer lag can leave a pool stale for >1 week
// (e.g. Arbitrum), so a yesterday-only window drops live positions.
const LOOKBACK_DAYS = 30;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const EVM_NATIVE_TOKEN_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
export const BERACHAIN_NATIVE_TOKEN_ADDRESS = "0x6969696969696969696969696969696969696969";

type NativeTokenContract = {
  displayName: string;
  contractName: string;
  tokenAddress: string;
};

const NATIVE_TOKEN_CONTRACT_BY_CHAIN: Record<string, NativeTokenContract> = {
  Arbitrum: {
    displayName: "ETH",
    contractName: "ETH",
    tokenAddress: EVM_NATIVE_TOKEN_ADDRESS,
  },
  Base: {
    displayName: "ETH",
    contractName: "ETH",
    tokenAddress: EVM_NATIVE_TOKEN_ADDRESS,
  },
  Berachain: {
    displayName: "BERA",
    contractName: "WBERA",
    tokenAddress: BERACHAIN_NATIVE_TOKEN_ADDRESS,
  },
  BSC: {
    displayName: "BNB",
    contractName: "BNB",
    tokenAddress: EVM_NATIVE_TOKEN_ADDRESS,
  },
  Ethereum: {
    displayName: "ETH",
    contractName: "ETH",
    tokenAddress: EVM_NATIVE_TOKEN_ADDRESS,
  },
  Fantom: {
    displayName: "FTM",
    contractName: "FTM",
    tokenAddress: EVM_NATIVE_TOKEN_ADDRESS,
  },
  Optimism: {
    displayName: "ETH",
    contractName: "ETH",
    tokenAddress: EVM_NATIVE_TOKEN_ADDRESS,
  },
  Polygon: {
    displayName: "POL",
    contractName: "POL",
    tokenAddress: EVM_NATIVE_TOKEN_ADDRESS,
  },
};

function isZeroAddress(value?: string | null): boolean {
  return value?.toLowerCase() === ZERO_ADDRESS;
}

export function getNativeTokenContract(
  token: string,
  blockchain?: string,
  tokenAddress?: string | null,
): NativeTokenContract | undefined {
  if (!isZeroAddress(token) && !isZeroAddress(tokenAddress)) return undefined;
  return NATIVE_TOKEN_CONTRACT_BY_CHAIN[blockchain ?? ""];
}

export function getDisplayTokenName(
  token: string,
  blockchain?: string,
  tokenAddress?: string | null,
): string {
  if (token.startsWith("USDS - Borrowed Through Cooler Loans"))
    return "Cooler Loan USDS Receivables";
  if (token.startsWith("DAI - Borrowed Through Cooler Loans")) return "Cooler Loan DAI Receivables";
  const nativeTokenContract = getNativeTokenContract(token, blockchain, tokenAddress);
  if (nativeTokenContract) return nativeTokenContract.displayName;
  if (isZeroAddress(token) || isZeroAddress(tokenAddress)) return "Native Token";
  return token;
}

export function useReserveBalances() {
  return useQuery<ReserveBalances>({
    queryKey: ["reserveBalances", "pulse", "treasury-subgraph"],
    queryFn: async () => {
      const startDate = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000)
        .toISOString()
        .split("T")[0];

      const raw = await fetchTreasuryAssets(startDate);
      const latestSnapshotRecords = filterLatestSnapshotPerChain(raw);

      const holdingAgg = new Map<string, ReserveHolding>();
      const lpAgg = new Map<string, LpPosition>();

      for (const rec of latestSnapshotRecords) {
        const value = parseEnvioNumber(rec.value);
        const balance = parseEnvioNumber(rec.balance);
        const valueExcludingOhm = parseEnvioNumber(rec.valueExcludingOhm);
        const backingContribution = rec.isLiquid ? valueExcludingOhm : 0;
        const nativeTokenContract = getNativeTokenContract(
          rec.token,
          rec.blockchain,
          rec.tokenAddress,
        );
        const token = getDisplayTokenName(rec.token, rec.blockchain, rec.tokenAddress);
        const holdingTokenAddress =
          nativeTokenContract?.tokenAddress ?? rec.tokenAddress ?? undefined;
        const holdingContractName = nativeTokenContract?.contractName;
        const holdingKey = `${
          holdingTokenAddress ?? token
        }|${holdingContractName ?? ""}|${token}|${rec.blockchain}|${rec.category}`;
        const existingHolding = holdingAgg.get(holdingKey);

        if (existingHolding) {
          existingHolding.balance += balance;
          existingHolding.value += value;
          existingHolding.isLiquid ||= rec.isLiquid;
          existingHolding.backingContribution += backingContribution;
        } else {
          holdingAgg.set(holdingKey, {
            token,
            tokenAddress: holdingTokenAddress,
            contractName: holdingContractName,
            blockchain: rec.blockchain,
            category: rec.category,
            balance,
            value,
            isLiquid: rec.isLiquid,
            backingContribution,
          });
        }

        if (rec.category === "Protocol-Owned Liquidity") {
          const lpKey = `${rec.token}|${rec.blockchain}`;
          const existingLp = lpAgg.get(lpKey);

          if (existingLp) {
            existingLp.value += value;
            existingLp.valueExcludingOhm += valueExcludingOhm;
          } else {
            lpAgg.set(lpKey, {
              name: rec.token,
              displayName: getDisplayTokenName(rec.token, rec.blockchain, rec.tokenAddress),
              blockchain: rec.blockchain,
              value,
              valueExcludingOhm,
            });
          }
        }
      }

      const holdings = Array.from(holdingAgg.values()).filter((h) => h.value > 1);
      let susdeValue = 0;
      let susdsValue = 0;
      for (const h of holdings) {
        const name = h.token.toLowerCase();
        if (name === "staked usde (susde)") susdeValue += h.value;
        else if (name === "savings usds (susds)") susdsValue += h.value;
      }
      const lpPositions = Array.from(lpAgg.values())
        .filter((p) => p.value > 1000)
        .sort((a, b) => b.value - a.value);

      return { susdeValue, susdsValue, lpPositions, holdings };
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}
