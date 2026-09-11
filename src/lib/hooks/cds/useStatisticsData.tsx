import { useQuery } from "@tanstack/react-query";
import { useChainId } from "wagmi";
import {
  getConvertibleDepositsAuctioneerSnapshots,
  getConvertibleDepositsBids,
  getConvertibleDepositsClaimedYields,
  getConvertibleDepositsConvertedDeposits,
  getConvertibleDepositsFacilitySnapshots,
} from "@/generated/indexer";
import type { ConversionSummary } from "@/lib/hooks/cds/cd-conversions";
import {
  fetchCdRevenue,
  fetchConversionExposure,
  fetchConversions,
} from "@/lib/hooks/cds/cd-indexer-queries";
import type { CdRevenue } from "@/lib/hooks/cds/cd-revenue";
import type { ConversionExposure } from "@/lib/hooks/cds/conversion-exposure";
import { parseDecimal, windowed, withNumericTimestamp } from "@/lib/indexer/rows";

/**
 * The CD routes are mainnet-only, so cache keys use this rather than the
 * connected chain — otherwise testnet mode caches mainnet payloads under a
 * Sepolia key.
 */
const CD_INDEXER_CHAIN_ID = 1;

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

/**
 * Every bid the auctioneer has recorded, for the two "all time" totals below.
 *
 * The bids route caps a page at 1000 and offers neither an offset nor a
 * `sinceId`, so a full page cannot be walked — and a total built from one is
 * indistinguishable from a real one by the time it reaches a card. It throws
 * instead, matching the policy in `cd-indexer-queries.ts`. At 275 bids today
 * there is plenty of headroom; if this ever trips, the fix is a cursor on the
 * route rather than a larger constant here.
 */
const BIDS_PAGE_LIMIT = 1000;

async function fetchAllTimeBids() {
  const { data: bids } = await getConvertibleDepositsBids({
    order: "asc",
    limit: BIDS_PAGE_LIMIT,
  });
  if (bids.length >= BIDS_PAGE_LIMIT) {
    throw new Error(
      `CD bids filled a ${BIDS_PAGE_LIMIT}-row page; refusing a partial all-time total`,
    );
  }
  return bids;
}

export function useAllTimeDeposits() {
  const chainId = useChainId();

  return useQuery<number>({
    queryKey: ["allTimeDeposits", chainId],
    queryFn: async () => {
      const bids = await fetchAllTimeBids();
      return bids.reduce((sum, bid) => sum + parseDecimal(bid.depositAmountDecimal), 0);
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
      const bids = await fetchAllTimeBids();
      return bids.reduce((sum, bid) => sum + parseDecimal(bid.convertedAmountDecimal), 0);
    },
    staleTime: 60000,
    refetchInterval: 120000,
  });
}

/**
 * Single cache entry for conversion exposure. Every consumer must go through this
 * key, otherwise two callers fetch the same quantity on different cadences and the
 * CD screen and the Pulse card can show different numbers at the same moment.
 *
 * Deliberately not keyed on the connected chain. Every CD indexer query is hardcoded
 * to `chainId: 1`, so keying on useChainId() would file the same mainnet payload
 * under a Sepolia identity in testnet mode and split the cache in two.
 */
export const conversionExposureQuery = {
  queryKey: ["conversionExposure", CD_INDEXER_CHAIN_ID] as const,
  queryFn: fetchConversionExposure,
  staleTime: 60000,
};

// Hook for the conversion exposure the treasury carries: gross (every deposit
// converts), net of the principal already borrowed back out, and the per-claim
// strikes behind both.
export function useConversionExposure() {
  return useQuery<ConversionExposure>({
    ...conversionExposureQuery,
    refetchInterval: 120000,
  });
}

// Hook for CD revenue: interest on redemption-vault loans plus deposit yield
// swept to the treasury.
export function useCdRevenue() {
  return useQuery<CdRevenue>({
    queryKey: ["cdRevenue", CD_INDEXER_CHAIN_ID],
    queryFn: fetchCdRevenue,
    staleTime: 60000,
    refetchInterval: 120000,
  });
}

// Hook for realised conversions: deposits that actually became OHM.
export function useConversions(timeRange: TimeRange = "30d") {
  const windowStart = Math.floor(Date.now() / 1000) - TIME_RANGE_SECONDS[timeRange];

  return useQuery<ConversionSummary>({
    queryKey: ["cdConversions", CD_INDEXER_CHAIN_ID, timeRange],
    queryFn: () => fetchConversions(windowStart),
    staleTime: 60000,
    refetchInterval: 120000,
  });
}
