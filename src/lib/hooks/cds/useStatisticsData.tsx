import { useQuery } from "@tanstack/react-query";
import { useChainId } from "wagmi";
import {
  getConvertibleDepositsAuctioneerSnapshots,
  getConvertibleDepositsBids,
  getConvertibleDepositsClaimedYields,
  getConvertibleDepositsConvertedDeposits,
  getConvertibleDepositsFacilitySnapshots,
  getConvertibleDepositsPositions,
} from "@/generated/indexer";
import { calculateConversionExposure } from "@/lib/hooks/cds/conversion-exposure";
import { fetchRedemptionExposure } from "@/lib/hooks/cds/redemption-exposure";
import { windowed, withNumericTimestamp, unwrap } from "@/lib/indexer/rows";

// Types for GraphQL responses
export interface DepositSnapshot {
  timestamp: number;
  totalDeposited: string;
  totalDepositedDecimal: string;
  claimableYield: string;
  claimableYieldDecimal: string;
  borrowedAmount: string;
  borrowedAmountDecimal: string;
  pendingRedemption: string;
  pendingRedemptionDecimal: string;
}

export interface BidEvent {
  timestamp: number;
  depositor: string;
  depositAmount: string;
  depositAmountDecimal: string;
  convertedAmount: string;
  convertedAmountDecimal: string;
  tickPrice: string;
  tickPriceDecimal: string;
}

export interface AuctioneerSnapshot {
  timestamp: number;
  target: string;
  targetDecimal: string;
  ohmSold: string;
  ohmSoldDecimal: string;
  minPrice: string;
  minPriceDecimal: string;
}

export interface ConvertedDeposit {
  timestamp: number;
  depositor: string;
  depositAmount: string;
  depositAmountDecimal: string;
  convertedAmount: string;
  convertedAmountDecimal: string;
}

export interface ClaimedYield {
  timestamp: number;
  amount: string;
  amountDecimal: string;
}

export interface StatisticsData {
  depositSnapshots: DepositSnapshot[];
  bids: BidEvent[];
  auctioneerSnapshots: AuctioneerSnapshot[];
  convertedDeposits: ConvertedDeposit[];
  claimedYields: ClaimedYield[];
}

export type TimeRange = "7d" | "30d" | "1y";

const TIME_RANGE_SECONDS: Record<TimeRange, number> = {
  "7d": 7 * 24 * 60 * 60,
  "30d": 30 * 24 * 60 * 60,
  "1y": 365 * 24 * 60 * 60,
};

export function useStatisticsData(timeRange: TimeRange = "7d") {
  const chainId = useChainId();
  const startTimestamp = Math.floor(Date.now() / 1000) - TIME_RANGE_SECONDS[timeRange];

  return useQuery<StatisticsData>({
    queryKey: ["statisticsData", chainId, timeRange],
    queryFn: async () => {
      // Five windowed lists, previously one Ponder document with five roots.
      const window = { sinceTimestamp: String(startTimestamp), order: "asc", limit: 1000 } as const;
      const [depositSnapshots, bids, auctioneerSnapshots, convertedDeposits, claimedYields] =
        await Promise.all([
          windowed(() => getConvertibleDepositsFacilitySnapshots(window)),
          windowed(() => getConvertibleDepositsBids(window)),
          windowed(() => getConvertibleDepositsAuctioneerSnapshots(window)),
          windowed(() => getConvertibleDepositsConvertedDeposits(window)),
          windowed(() => getConvertibleDepositsClaimedYields(window)),
        ]);

      return { depositSnapshots, bids, auctioneerSnapshots, convertedDeposits, claimedYields };
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

// Latest snapshot plus the one before it, for headline metrics and their delta.
export function useCurrentStatistics() {
  const chainId = useChainId();

  return useQuery<{
    latestSnapshot: DepositSnapshot | null;
    previousSnapshot: DepositSnapshot | null;
  }>({
    queryKey: ["currentStatistics", chainId],
    queryFn: async () => {
      const { data: snapshots } = await getConvertibleDepositsFacilitySnapshots({
        order: "desc",
        limit: 2,
      });
      return {
        latestSnapshot: snapshots[0] ? withNumericTimestamp(snapshots[0]) : null,
        previousSnapshot: snapshots[1] ? withNumericTimestamp(snapshots[1]) : null,
      };
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useAllTimeDeposits() {
  const chainId = useChainId();

  return useQuery<number>({
    queryKey: ["allTimeDeposits", chainId],
    queryFn: async () => {
      const { data: bids } = await getConvertibleDepositsBids({ order: "asc", limit: 1000 });
      return bids.reduce((sum, bid) => sum + Number.parseFloat(bid.depositAmountDecimal), 0);
    },
    staleTime: 60000,
    refetchInterval: 120000,
  });
}

export function useAllTimeConvertibleOhm() {
  const chainId = useChainId();

  return useQuery<number>({
    queryKey: ["allTimeConvertibleOhm", chainId],
    queryFn: async () => {
      const { data: bids } = await getConvertibleDepositsBids({ order: "asc", limit: 1000 });
      return bids.reduce((sum, bid) => sum + Number.parseFloat(bid.convertedAmountDecimal), 0);
    },
    staleTime: 60000,
    refetchInterval: 120000,
  });
}

// Current convertible deposits: the USD in deposits and the OHM they would mint.
export function useCurrentConvertibleOhm() {
  const chainId = useChainId();

  return useQuery<{ convertibleOhm: number; totalDepositsUsd: number }>({
    queryKey: ["currentConvertibleOhm", chainId],
    queryFn: async () => {
      const [positions, redemptions] = await Promise.all([
        unwrap(getConvertibleDepositsPositions({ limit: 1000 })),
        fetchRedemptionExposure(),
      ]);

      const { convertibleOhm, totalDepositsUsd } = calculateConversionExposure(
        positions,
        redemptions,
      );
      return { convertibleOhm, totalDepositsUsd };
    },
    staleTime: 60000,
    refetchInterval: 120000,
  });
}
