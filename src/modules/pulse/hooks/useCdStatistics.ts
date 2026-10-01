import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getConvertibleDepositsBids,
  getConvertibleDepositsConvertedDeposits,
  getConvertibleDepositsStatistics,
} from "@/generated/indexer";
import { conversionExposureQuery } from "@/lib/hooks/cds/useStatisticsData";
import { unwrap, withNumericTimestamp } from "@/lib/indexer/rows";

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
  /** Deposits still in the protocol, net of principal borrowed back out. */
  totalDepositsUsd: number;
  activeBidsCount: number;
  /** Outstanding loan principal against pending redemptions. */
  borrowedAmount: number;
  annualInterestRate: number;
  isMarketActive: boolean;
  /** OHM minted if leverage unwinds and only unlevered positions convert. */
  supplyGrowthOhm: number;
}

export function useCdStatistics() {
  const queryClient = useQueryClient();

  return useQuery<CdStatistics>({
    queryKey: ["cdStatistics"],
    queryFn: async () => {
      const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;

      // The Ponder version issued one document with seven roots. `statistics`
      // collapses the three singletons the card reads (latest facility
      // snapshot, latest auctioneer snapshot, redemption-vault config); the
      // rest are windowed lists, fetched in parallel.
      const [statistics, bidRows, convertedRows] = await Promise.all([
        unwrap(getConvertibleDepositsStatistics()),
        unwrap(getConvertibleDepositsBids({ sinceTimestamp: String(thirtyDaysAgo), limit: 1000 })),
        unwrap(
          getConvertibleDepositsConvertedDeposits({
            sinceTimestamp: String(thirtyDaysAgo),
            limit: 1000,
          }),
        ),
      ]);

      const bids = bidRows.map(withNumericTimestamp);
      const convertedDeposits = convertedRows.map(withNumericTimestamp);
      const latestSnapshot = statistics.facilitySnapshot
        ? withNumericTimestamp(statistics.facilitySnapshot)
        : null;
      const depositSnapshots = latestSnapshot ? [latestSnapshot] : [];

      const annualInterestRate = statistics.redemptionConfig
        ? Number.parseFloat(statistics.redemptionConfig.interestRateDecimal) || 0
        : 0;

      const isMarketActive = statistics.auctioneerSnapshot
        ? Number.parseFloat(statistics.auctioneerSnapshot.targetDecimal) > 0
        : false;

      // Derived from positions and loans rather than the facility snapshot: the
      // snapshot's totalDeposited is emitted as a malformed negative decimal, and its
      // borrowedAmount tracks principal at origination rather than what is outstanding.
      //
      // Routed through the shared cache entry so this and the CD metrics screen read
      // one value rather than fetching the same thing twice on different cadences.
      const exposure = await queryClient.fetchQuery(conversionExposureQuery);

      return {
        depositSnapshots,
        bids,
        convertedDeposits,
        latestSnapshot,
        totalDepositsUsd: exposure.netDepositsUsd,
        activeBidsCount: bids.length,
        borrowedAmount: exposure.borrowedPrincipalUsd,
        annualInterestRate,
        isMarketActive,
        supplyGrowthOhm: exposure.netConvertibleOhm,
      };
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}
