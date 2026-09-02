import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CD_SUBGRAPH_URL } from "@/lib/constants";
import { conversionExposureQuery } from "@/lib/hooks/cds/useStatisticsData";

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

      const query = `
        query GetCdStatistics {
          depositFacilityAssetSnapshots(
            where: { chainId: 1 }
            orderBy: "timestamp"
            orderDirection: "desc"
            limit: 1
          ) {
            items {
              timestamp
              totalDeposited
              totalDepositedDecimal
              borrowedAmount
              borrowedAmountDecimal
            }
          }

          convertibleDepositAuctioneerBids(
            where: {
              chainId: 1,
              timestamp_gte: "${thirtyDaysAgo}"
            }
            orderBy: "timestamp"
            orderDirection: "desc"
            limit: 50
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

          convertibleDepositFacilityConvertedDeposits(
            where: {
              chainId: 1,
              timestamp_gte: "${thirtyDaysAgo}"
            }
            orderBy: "timestamp"
            orderDirection: "desc"
            limit: 50
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

          depositRedemptionVaultAssetConfigurations(limit: 1) {
            items {
              interestRateDecimal
            }
          }

          auctioneerSnapshots(
            where: { chainId: 1 }
            orderBy: "timestamp"
            orderDirection: "desc"
            limit: 1
          ) {
            items {
              timestamp
              targetDecimal
            }
          }
        }
      `;

      const response = await fetch(CD_SUBGRAPH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) throw new Error("Failed to fetch CD statistics");

      const { data, errors } = await response.json();
      if (errors) throw new Error(errors[0]?.message || "CD subgraph error");

      const depositSnapshots = (data?.depositFacilityAssetSnapshots?.items || []).map(
        (item: Record<string, string>) => ({
          ...item,
          timestamp: Number(item.timestamp),
        }),
      );

      const bids = (data?.convertibleDepositAuctioneerBids?.items || []).map(
        (item: Record<string, string>) => ({
          ...item,
          timestamp: Number(item.timestamp),
        }),
      );

      const convertedDeposits = (
        data?.convertibleDepositFacilityConvertedDeposits?.items || []
      ).map((item: Record<string, string>) => ({
        ...item,
        timestamp: Number(item.timestamp),
      }));

      const latestSnapshot = depositSnapshots[0] || null;

      const rateConfig = data?.depositRedemptionVaultAssetConfigurations?.items?.[0];
      const annualInterestRate = rateConfig ? parseFloat(rateConfig.interestRateDecimal) || 0 : 0;

      // Market status
      const latestAuctioneerSnapshot = data?.auctioneerSnapshots?.items?.[0];
      const isMarketActive = latestAuctioneerSnapshot
        ? parseFloat(latestAuctioneerSnapshot.targetDecimal) > 0
        : false;

      // Derived from positions and loans rather than the facility snapshot: the
      // snapshot's totalDeposited is emitted as a malformed negative decimal, and its
      // borrowedAmount tracks principal at origination rather than what is outstanding.
      //
      // Routed through the shared cache entry so this and the CD metrics screen read
      // one value rather than fetching the same thing twice on different cadences.
      const exposure = await queryClient.fetchQuery(conversionExposureQuery(1));

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
