import { useQuery } from "@tanstack/react-query";
import { useChainId } from "wagmi";
import { fetchIndexerData } from "@/lib/indexer/client";
import {
  calculateConversionExposure,
  type ConvertiblePositionExposure,
} from "@/lib/hooks/cds/conversion-exposure";
import { fetchRedemptionExposure } from "@/lib/hooks/cds/redemption-exposure";

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

// Every list route here windows on `sinceTimestamp` and returns rows whose
// `timestamp` is a string; the UI types it as a number.
type Timestamped = { timestamp: string };

async function windowed<T extends Timestamped>(
  path: string,
  sinceTimestamp?: number,
): Promise<(Omit<T, "timestamp"> & { timestamp: number })[]> {
  const rows = await fetchIndexerData<T[]>(path, {
    sinceTimestamp,
    order: "asc",
    limit: 1000,
  });
  return rows.map((row) => ({ ...row, timestamp: Number(row.timestamp) }));
}

export function useStatisticsData(timeRange: TimeRange = "7d") {
  const chainId = useChainId();
  const startTimestamp = Math.floor(Date.now() / 1000) - TIME_RANGE_SECONDS[timeRange];

  return useQuery<StatisticsData>({
    queryKey: ["statisticsData", chainId, timeRange],
    queryFn: async () => {
      // Five windowed lists, previously one Ponder document with five roots.
      const [depositSnapshots, bids, auctioneerSnapshots, convertedDeposits, claimedYields] =
        await Promise.all([
          windowed<DepositSnapshot & Timestamped>(
            "/v1/convertible-deposits/facility-snapshots",
            startTimestamp,
          ),
          windowed<BidEvent & Timestamped>("/v1/convertible-deposits/bids", startTimestamp),
          windowed<AuctioneerSnapshot & Timestamped>(
            "/v1/convertible-deposits/auctioneer-snapshots",
            startTimestamp,
          ),
          windowed<ConvertedDeposit & Timestamped>(
            "/v1/convertible-deposits/converted-deposits",
            startTimestamp,
          ),
          windowed<ClaimedYield & Timestamped>(
            "/v1/convertible-deposits/claimed-yields",
            startTimestamp,
          ),
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
      const snapshots = await fetchIndexerData<DepositSnapshot[]>(
        "/v1/convertible-deposits/facility-snapshots",
        { order: "desc", limit: 2 },
      );
      return {
        latestSnapshot: snapshots[0] ?? null,
        previousSnapshot: snapshots[1] ?? null,
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
      const bids = await fetchIndexerData<{ depositAmountDecimal: string }[]>(
        "/v1/convertible-deposits/bids",
        { order: "asc", limit: 1000 },
      );
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
      const bids = await fetchIndexerData<{ convertedAmountDecimal: string }[]>(
        "/v1/convertible-deposits/bids",
        { order: "asc", limit: 1000 },
      );
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
        fetchIndexerData<ConvertiblePositionExposure[]>("/v1/convertible-deposits/positions", {
          limit: 1000,
        }),
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
