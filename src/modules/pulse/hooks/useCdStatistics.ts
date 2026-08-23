import { useQuery } from "@tanstack/react-query";
import { calculateConversionExposure } from "@/lib/hooks/cds/conversion-exposure";
import { fetchIndexerData } from "@/lib/indexer/client";

export interface DepositSnapshot {
  timestamp: number;
  totalDeposited: string;
  totalDepositedDecimal: string;
  borrowedAmount: string;
  borrowedAmountDecimal: string;
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

export interface ConvertedDeposit {
  timestamp: number;
  depositor: string;
  depositAmount: string;
  depositAmountDecimal: string;
  convertedAmount: string;
  convertedAmountDecimal: string;
}

export interface CdStatistics {
  depositSnapshots: DepositSnapshot[];
  bids: BidEvent[];
  convertedDeposits: ConvertedDeposit[];
  latestSnapshot: DepositSnapshot | null;
  totalDepositsUsd: number;
  activeBidsCount: number;
  borrowedAmount: number;
  annualInterestRate: number;
  isMarketActive: boolean;
  supplyGrowthOhm: number;
}

export function useCdStatistics() {
  return useQuery<CdStatistics>({
    queryKey: ["cdStatistics"],
    queryFn: async () => {
      const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;

      // The Ponder version issued one document with seven roots. `statistics`
      // collapses the three singletons the card reads (latest facility
      // snapshot, latest auctioneer snapshot, redemption-vault config); the
      // rest are windowed lists, fetched in parallel.
      const [statistics, bidRows, convertedRows, positions, redemptions] = await Promise.all([
        fetchIndexerData<{
          facilitySnapshot: (DepositSnapshot & { timestamp: string }) | null;
          auctioneerSnapshot: { targetDecimal: string } | null;
          redemptionConfig: { interestRateDecimal: string } | null;
        }>("/v1/convertible-deposits/statistics"),
        fetchIndexerData<(BidEvent & { timestamp: string })[]>("/v1/convertible-deposits/bids", {
          sinceTimestamp: thirtyDaysAgo,
          limit: 1000,
        }),
        fetchIndexerData<(ConvertedDeposit & { timestamp: string })[]>(
          "/v1/convertible-deposits/converted-deposits",
          { sinceTimestamp: thirtyDaysAgo, limit: 1000 },
        ),
        fetchIndexerData<Parameters<typeof calculateConversionExposure>[0]>(
          "/v1/convertible-deposits/positions",
          { limit: 1000 },
        ),
        fetchIndexerData<Parameters<typeof calculateConversionExposure>[1]>(
          "/v1/convertible-deposits/redemptions",
          { limit: 1000 },
        ),
      ]);

      // Timestamps cross the wire as strings; the UI types them as numbers.
      const toNumericTimestamp = <T extends { timestamp: string }>(row: T) => ({
        ...row,
        timestamp: Number(row.timestamp),
      });

      const bids = bidRows.map(toNumericTimestamp);
      const convertedDeposits = convertedRows.map(toNumericTimestamp);
      const latestSnapshot = statistics.facilitySnapshot
        ? toNumericTimestamp(statistics.facilitySnapshot)
        : null;
      const depositSnapshots = latestSnapshot ? [latestSnapshot] : [];

      const totalDepositsUsd = latestSnapshot
        ? Number.parseFloat(latestSnapshot.totalDepositedDecimal) +
          Number.parseFloat(latestSnapshot.borrowedAmountDecimal)
        : 0;

      const borrowedAmount = latestSnapshot
        ? Number.parseFloat(latestSnapshot.borrowedAmountDecimal) || 0
        : 0;

      const annualInterestRate = statistics.redemptionConfig
        ? Number.parseFloat(statistics.redemptionConfig.interestRateDecimal) || 0
        : 0;

      const isMarketActive = statistics.auctioneerSnapshot
        ? Number.parseFloat(statistics.auctioneerSnapshot.targetDecimal) > 0
        : false;

      const { convertibleOhm: supplyGrowthOhm } = calculateConversionExposure(
        positions,
        redemptions,
      );

      return {
        depositSnapshots,
        bids,
        convertedDeposits,
        latestSnapshot,
        totalDepositsUsd,
        activeBidsCount: bids.length,
        borrowedAmount,
        annualInterestRate,
        isMarketActive,
        supplyGrowthOhm,
      };
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}
