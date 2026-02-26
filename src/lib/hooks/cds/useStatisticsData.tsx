import { useQuery } from "@tanstack/react-query";
import { useChainId } from "wagmi";
import { GRAPHQL_ENDPOINT } from "@/lib/constants";

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

      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const { data, errors } = await response.json();
      if (errors) throw new Error(errors[0]?.message || "GraphQL error");

      return {
        depositSnapshots: (data?.depositFacilityAssetSnapshots?.items || []).map(
          (item: Record<string, string>) => ({
            ...item,
            timestamp: Number(item.timestamp),
          })
        ),
        bids: (data?.convertibleDepositAuctioneerBids?.items || []).map(
          (item: Record<string, string>) => ({
            ...item,
            timestamp: Number(item.timestamp),
          })
        ),
        auctioneerSnapshots: (data?.auctioneerSnapshots?.items || []).map(
          (item: Record<string, string>) => ({
            ...item,
            timestamp: Number(item.timestamp),
          })
        ),
        convertedDeposits: (data?.convertibleDepositFacilityConvertedDeposits?.items || []).map(
          (item: Record<string, string>) => ({
            ...item,
            timestamp: Number(item.timestamp),
          })
        ),
        claimedYields: (data?.convertibleDepositFacilityClaimedYields?.items || []).map(
          (item: Record<string, string>) => ({
            ...item,
            timestamp: Number(item.timestamp),
          })
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

      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const { data, errors } = await response.json();
      if (errors) throw new Error(errors[0]?.message || "GraphQL error");

      const snapshots = (data?.depositFacilityAssetSnapshots?.items || []).map(
        (item: Record<string, string>) => ({
          ...item,
          timestamp: Number(item.timestamp),
        })
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

      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const { data, errors } = await response.json();
      if (errors) throw new Error(errors[0]?.message || "GraphQL error");

      const bids = data?.convertibleDepositAuctioneerBids?.items || [];
      return bids.reduce(
        (sum: number, bid: { depositAmountDecimal: string }) =>
          sum + parseFloat(bid.depositAmountDecimal),
        0
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

      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const { data, errors } = await response.json();
      if (errors) throw new Error(errors[0]?.message || "GraphQL error");

      const bids = data?.convertibleDepositAuctioneerBids?.items || [];
      return bids.reduce(
        (sum: number, bid: { convertedAmountDecimal: string }) =>
          sum + parseFloat(bid.convertedAmountDecimal),
        0
      );
    },
    staleTime: 60000,
    refetchInterval: 120000,
  });
}

// Hook to get current convertible deposits data
// Returns both the total USD in deposits and the OHM that would be minted
export function useCurrentConvertibleOhm() {
  const chainId = useChainId();

  return useQuery<{ convertibleOhm: number; totalDepositsUsd: number }>({
    queryKey: ["currentConvertibleOhm", chainId],
    queryFn: async () => {
      const query = `
        query GetCurrentConvertibleData {
          depositFacilityAssetSnapshots(
            where: {
              chainId: 1
            }
            orderBy: "timestamp"
            orderDirection: "desc"
            limit: 1
          ) {
            items {
              totalDepositedDecimal
              borrowedAmountDecimal
            }
          }
          convertibleDepositPositions(
            where: {
              chainId: 1
            }
            orderBy: "timestamp"
            orderDirection: "asc"
            limit: 1000
          ) {
            items {
              remainingAmountDecimal
              conversionPriceDecimal
            }
          }
        }
      `;

      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const { data, errors } = await response.json();
      if (errors) throw new Error(errors[0]?.message || "GraphQL error");

      // Get total deposits USD from snapshot (totalDeposited + borrowedAmount)
      const snapshot = data?.depositFacilityAssetSnapshots?.items?.[0];
      const totalDepositsUsd = snapshot
        ? parseFloat(snapshot.totalDepositedDecimal) + parseFloat(snapshot.borrowedAmountDecimal)
        : 0;

      // Calculate convertible OHM from positions (remainingAmount / conversionPrice)
      const positions = data?.convertibleDepositPositions?.items || [];
      const convertibleOhm = positions.reduce(
        (sum: number, position: { remainingAmountDecimal: string; conversionPriceDecimal: string }) => {
          const remaining = parseFloat(position.remainingAmountDecimal);
          const price = parseFloat(position.conversionPriceDecimal);
          if (remaining > 0 && price > 0) {
            return sum + remaining / price;
          }
          return sum;
        },
        0
      );

      return { convertibleOhm, totalDepositsUsd };
    },
    staleTime: 60000,
    refetchInterval: 120000,
  });
}
