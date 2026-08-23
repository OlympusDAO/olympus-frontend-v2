import { useQuery } from "@tanstack/react-query";
import { useChainId } from "wagmi";
import { fetchIndexerData } from "@/lib/indexer/client";

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

// The wire shapes. Only the timestamp and the `*Decimal` fields the charts do
// arithmetic on need converting — `depositPeriod` and `isAuctionActive` already
// arrive as a number and a boolean.
type RawBid = Omit<HistoricalBid, "timestamp" | "tickPriceDecimal"> & {
  timestamp: string;
  tickPriceDecimal: string;
};
type RawAuctioneerSnapshot = Omit<AuctioneerSnapshot, "timestamp"> & { timestamp: string };
type RawDepositPeriodSnapshot = Omit<
  DepositPeriodSnapshot,
  "timestamp" | "currentTickPriceDecimal"
> & { timestamp: string; currentTickPriceDecimal: string };

interface HistoricalPriceData {
  bids: HistoricalBid[];
  snapshots: AuctioneerSnapshot[];
  depositPeriodSnapshots: DepositPeriodSnapshot[];
}

export function useHistoricalPriceData(
  depositPeriod?: number,
  timeRange: "1d" | "7d" | "30d" | "all" = "7d",
) {
  const chainId = useChainId();

  const timeRangeInSeconds: Record<string, number> = {
    "1d": 86400,
    "7d": 604800,
    "30d": 2592000,
    all: 0,
  };

  const startTimestamp =
    timeRangeInSeconds[timeRange] > 0
      ? Math.floor(Date.now() / 1000) - timeRangeInSeconds[timeRange]
      : 0;

  return useQuery<HistoricalPriceData>({
    queryKey: ["historicalPriceData", chainId, depositPeriod, timeRange],
    queryFn: async () => {
      // One request. The Ponder version issued three roots — bids, auctioneer
      // snapshots, and per-deposit-period tick snapshots — over the same
      // window; this route exists to return them together.
      const history = await fetchIndexerData<{
        bids: RawBid[];
        auctioneerSnapshots: RawAuctioneerSnapshot[];
        depositPeriodSnapshots: RawDepositPeriodSnapshot[];
      }>("/v1/convertible-deposits/price-history", {
        // `from: 0` would be an unnecessary filter; "all" simply omits it.
        from: startTimestamp > 0 ? startTimestamp : undefined,
        depositPeriod,
        limit: 1000,
      });

      return {
        bids: history.bids.map((item) => ({
          ...item,
          timestamp: Number(item.timestamp),
          tickPriceDecimal: Number(item.tickPriceDecimal),
        })),
        snapshots: history.auctioneerSnapshots.map((item) => ({
          ...item,
          timestamp: Number(item.timestamp),
        })),
        depositPeriodSnapshots: history.depositPeriodSnapshots.map((item) => ({
          ...item,
          timestamp: Number(item.timestamp),
          currentTickPriceDecimal: Number(item.currentTickPriceDecimal),
        })),
      };
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });
}
