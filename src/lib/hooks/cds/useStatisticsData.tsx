import { useQuery } from "@tanstack/react-query";
import { useChainId } from "wagmi";
import { cdsGraphqlClient } from "@/lib/graphql-client";
import type { ConversionExposure } from "@/lib/hooks/cds/conversion-exposure";
import type { CdRevenue } from "@/lib/hooks/cds/cd-revenue";
import type { ConversionSummary } from "@/lib/hooks/cds/cd-conversions";
import {
  fetchConversionExposure,
  fetchCdRevenue,
  fetchConversions,
} from "@/lib/hooks/cds/cd-indexer-queries";

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
      const query = `
        query GetStatisticsData {
          depositFacilityAssetSnapshots(
            where: {
              chainId: 1,
              timestamp_gte: "${startTimestamp}"
            }
            orderBy: "timestamp"
            orderDirection: "asc"
            limit: 1000
          ) {
            items {
              timestamp
              totalDeposited
              totalDepositedDecimal
              claimableYield
              claimableYieldDecimal
              borrowedAmount
              borrowedAmountDecimal
              pendingRedemption
              pendingRedemptionDecimal
            }
          }

          convertibleDepositAuctioneerBids(
            where: {
              chainId: 1,
              timestamp_gte: "${startTimestamp}"
            }
            orderBy: "timestamp"
            orderDirection: "asc"
            limit: 1000
          ) {
            items {
              timestamp
              depositor
              depositAmount
              depositAmountDecimal
              convertedAmount
              convertedAmountDecimal
              tickPrice
              tickPriceDecimal
            }
          }

          auctioneerSnapshots(
            where: {
              chainId: 1,
              timestamp_gte: "${startTimestamp}"
            }
            orderBy: "timestamp"
            orderDirection: "asc"
            limit: 1000
          ) {
            items {
              timestamp
              target
              targetDecimal
              ohmSold
              ohmSoldDecimal
              minPrice
              minPriceDecimal
            }
          }

          convertibleDepositFacilityConvertedDeposits(
            where: {
              chainId: 1,
              timestamp_gte: "${startTimestamp}"
            }
            orderBy: "timestamp"
            orderDirection: "asc"
            limit: 1000
          ) {
            items {
              timestamp
              depositor
              depositAmount
              depositAmountDecimal
              convertedAmount
              convertedAmountDecimal
            }
          }

          convertibleDepositFacilityClaimedYields(
            where: {
              chainId: 1,
              timestamp_gte: "${startTimestamp}"
            }
            orderBy: "timestamp"
            orderDirection: "asc"
            limit: 1000
          ) {
            items {
              timestamp
              amount
              amountDecimal
            }
          }
        }
      `;

      const data = await cdsGraphqlClient.request(query);

      return {
        depositSnapshots: (data?.depositFacilityAssetSnapshots?.items || []).map(
          (item: Record<string, string>) => ({
            ...item,
            timestamp: Number(item.timestamp),
          }),
        ),
        bids: (data?.convertibleDepositAuctioneerBids?.items || []).map(
          (item: Record<string, string>) => ({
            ...item,
            timestamp: Number(item.timestamp),
          }),
        ),
        auctioneerSnapshots: (data?.auctioneerSnapshots?.items || []).map(
          (item: Record<string, string>) => ({
            ...item,
            timestamp: Number(item.timestamp),
          }),
        ),
        convertedDeposits: (data?.convertibleDepositFacilityConvertedDeposits?.items || []).map(
          (item: Record<string, string>) => ({
            ...item,
            timestamp: Number(item.timestamp),
          }),
        ),
        claimedYields: (data?.convertibleDepositFacilityClaimedYields?.items || []).map(
          (item: Record<string, string>) => ({
            ...item,
            timestamp: Number(item.timestamp),
          }),
        ),
      };
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

// Hook to get current/latest snapshot data (for headline metrics)
export function useCurrentStatistics() {
  const chainId = useChainId();

  return useQuery<{
    latestSnapshot: DepositSnapshot | null;
    previousSnapshot: DepositSnapshot | null;
  }>({
    queryKey: ["currentStatistics", chainId],
    queryFn: async () => {
      const query = `
        query GetCurrentStatistics {
          depositFacilityAssetSnapshots(
            where: {
              chainId: 1
            }
            orderBy: "timestamp"
            orderDirection: "desc"
            limit: 2
          ) {
            items {
              timestamp
              totalDeposited
              totalDepositedDecimal
              claimableYield
              claimableYieldDecimal
              borrowedAmount
              borrowedAmountDecimal
              pendingRedemption
              pendingRedemptionDecimal
            }
          }
        }
      `;

      const data = await cdsGraphqlClient.request(query);

      const snapshots = (data?.depositFacilityAssetSnapshots?.items || []).map(
        (item: Record<string, string>) => ({
          ...item,
          timestamp: Number(item.timestamp),
        }),
      );

      return {
        latestSnapshot: snapshots[0] || null,
        previousSnapshot: snapshots[1] || null,
      };
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

// Hook to get all-time total deposits (sum of all bids)
export function useAllTimeDeposits() {
  const chainId = useChainId();

  return useQuery<number>({
    queryKey: ["allTimeDeposits", chainId],
    queryFn: async () => {
      // Fetch all bids (no time filter) to sum total deposits
      const query = `
        query GetAllTimeBids {
          convertibleDepositAuctioneerBids(
            where: {
              chainId: 1
            }
            orderBy: "timestamp"
            orderDirection: "asc"
            limit: 1000
          ) {
            items {
              depositAmountDecimal
            }
          }
        }
      `;

      const data = await cdsGraphqlClient.request(query);

      const bids = data?.convertibleDepositAuctioneerBids?.items || [];
      return bids.reduce(
        (sum: number, bid: { depositAmountDecimal: string }) =>
          sum + parseFloat(bid.depositAmountDecimal),
        0,
      );
    },
    staleTime: 60000,
    refetchInterval: 120000,
  });
}

// Hook to get total convertible OHM (sum of convertedAmount from all bids)
// This represents the OHM that will be minted based on each deposit's locked-in conversion price
export function useAllTimeConvertibleOhm() {
  const chainId = useChainId();

  return useQuery<number>({
    queryKey: ["allTimeConvertibleOhm", chainId],
    queryFn: async () => {
      const query = `
        query GetAllTimeBidsWithConvertedAmount {
          convertibleDepositAuctioneerBids(
            where: {
              chainId: 1
            }
            orderBy: "timestamp"
            orderDirection: "asc"
            limit: 1000
          ) {
            items {
              convertedAmountDecimal
            }
          }
        }
      `;

      const data = await cdsGraphqlClient.request(query);

      const bids = data?.convertibleDepositAuctioneerBids?.items || [];
      return bids.reduce(
        (sum: number, bid: { convertedAmountDecimal: string }) =>
          sum + parseFloat(bid.convertedAmountDecimal),
        0,
      );
    },
    staleTime: 60000,
    refetchInterval: 120000,
  });
}

/**
 * Single cache entry for conversion exposure. Every consumer must go through this
 * key, otherwise two callers fetch the same quantity on different cadences and the
 * CD screen and the Pulse card can show different numbers at the same moment.
 */
export const conversionExposureQuery = (chainId: number) => ({
  queryKey: ["conversionExposure", chainId] as const,
  queryFn: fetchConversionExposure,
  staleTime: 60000,
});

// Hook for the conversion exposure the treasury carries: gross (every deposit
// converts), net of the principal already borrowed back out, and the per-claim
// strikes behind both.
export function useConversionExposure() {
  const chainId = useChainId();

  return useQuery<ConversionExposure>({
    ...conversionExposureQuery(chainId),
    refetchInterval: 120000,
  });
}

// Hook for CD revenue: interest on redemption-vault loans plus deposit yield
// swept to the treasury.
export function useCdRevenue() {
  const chainId = useChainId();

  return useQuery<CdRevenue>({
    queryKey: ["cdRevenue", chainId],
    queryFn: fetchCdRevenue,
    staleTime: 60000,
    refetchInterval: 120000,
  });
}

// Hook for realised conversions: deposits that actually became OHM.
export function useConversions(timeRange: TimeRange = "30d") {
  const chainId = useChainId();
  const windowStart = Math.floor(Date.now() / 1000) - TIME_RANGE_SECONDS[timeRange];

  return useQuery<ConversionSummary>({
    queryKey: ["cdConversions", chainId, timeRange],
    queryFn: () => fetchConversions(windowStart),
    staleTime: 60000,
    refetchInterval: 120000,
  });
}
