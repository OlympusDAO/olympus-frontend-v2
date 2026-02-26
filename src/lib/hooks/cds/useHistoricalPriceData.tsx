import { useQuery } from "@tanstack/react-query";
import { useChainId } from "wagmi";
import { GRAPHQL_ENDPOINT } from "@/lib/constants";

export interface HistoricalBid {
  timestamp: number;
  tickPrice: string;
  tickPriceDecimal: number;
  tickCapacity: string;
  depositAmount: string;
  convertedAmount: string;
  depositPeriod: number;
}

export interface AuctioneerSnapshot {
  timestamp: number;
  target: string;
  targetDecimal: string;
  tickSize: string;
  minPrice: string;
  minPriceDecimal: string;
  ohmSold: string;
  ohmSoldDecimal: string;
  isAuctionActive: boolean;
}

export interface DepositPeriodSnapshot {
  timestamp: number;
  currentTickPrice: string;
  currentTickPriceDecimal: number;
  currentTickCapacity: string;
  depositPeriod: number;
}

interface HistoricalPriceData {
  bids: HistoricalBid[];
  snapshots: AuctioneerSnapshot[];
  depositPeriodSnapshots: DepositPeriodSnapshot[];
}


export function useHistoricalPriceData(
  depositPeriod?: number,
  timeRange: "1d" | "7d" | "30d" | "all" = "7d"
) {
  const chainId = useChainId();

  const timeRangeInSeconds: Record<string, number> = {
    "1d": 86400,
    "7d": 604800,
    "30d": 2592000,
    "all": 0,
  };

  const startTimestamp =
    timeRangeInSeconds[timeRange] > 0
      ? Math.floor(Date.now() / 1000) - timeRangeInSeconds[timeRange]
      : 0;

  return useQuery<HistoricalPriceData>({
    queryKey: ["historicalPriceData", chainId, depositPeriod, timeRange],
    queryFn: async () => {
      // Build the deposit period filter
      const depositPeriodFilter = depositPeriod !== undefined
        ? `depositPeriod: ${depositPeriod},`
        : "";

      const query = `
        query GetHistoricalData {
          convertibleDepositAuctioneerBids(
            where: {
              chainId: 1,
              ${depositPeriodFilter}
              timestamp_gte: "${startTimestamp}"
            }
            orderBy: "timestamp"
            orderDirection: "asc"
            limit: 1000
          ) {
            items {
              timestamp
              tickPrice
              tickPriceDecimal
              tickCapacity
              depositAmount
              convertedAmount
              depositPeriod
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
              tickSize
              minPrice
              minPriceDecimal
              ohmSold
              ohmSoldDecimal
              isAuctionActive
            }
          }

          auctioneerDepositPeriodSnapshots(
            where: {
              chainId: 1,
              ${depositPeriodFilter}
              timestamp_gte: "${startTimestamp}"
            }
            orderBy: "timestamp"
            orderDirection: "asc"
            limit: 1000
          ) {
            items {
              timestamp
              currentTickPrice
              currentTickPriceDecimal
              currentTickCapacity
              depositPeriod
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
        bids: (data?.convertibleDepositAuctioneerBids?.items || []).map(
          (item: Record<string, string>) => ({
            ...item,
            timestamp: Number(item.timestamp),
            tickPriceDecimal: Number(item.tickPriceDecimal),
          })
        ),
        snapshots: (data?.auctioneerSnapshots?.items || []).map(
          (item: Record<string, string>) => ({
            ...item,
            timestamp: Number(item.timestamp),
          })
        ),
        depositPeriodSnapshots: (
          data?.auctioneerDepositPeriodSnapshots?.items || []
        ).map((item: Record<string, string>) => ({
          ...item,
          timestamp: Number(item.timestamp),
          currentTickPriceDecimal: Number(item.currentTickPriceDecimal),
        })),
      };
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}
