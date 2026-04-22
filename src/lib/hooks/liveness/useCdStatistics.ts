import { useQuery } from "@tanstack/react-query";
import { CD_SUBGRAPH_URL } from "@/lib/constants";

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

      const query = `
        query GetCdStatistics {
          depositFacilityAssetSnapshots(
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

          convertibleDepositPositions(
            where: { chainId: 1 }
            limit: 1000
          ) {
            items {
              remainingAmountDecimal
              conversionPriceDecimal
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
      const totalDepositsUsd = latestSnapshot
        ? parseFloat(latestSnapshot.totalDepositedDecimal) +
          parseFloat(latestSnapshot.borrowedAmountDecimal)
        : 0;

      const borrowedAmount = latestSnapshot
        ? parseFloat(latestSnapshot.borrowedAmountDecimal) || 0
        : 0;

      const rateConfig = data?.depositRedemptionVaultAssetConfigurations?.items?.[0];
      const annualInterestRate = rateConfig ? parseFloat(rateConfig.interestRateDecimal) || 0 : 0;

      // Market status
      const latestAuctioneerSnapshot = data?.auctioneerSnapshots?.items?.[0];
      const isMarketActive = latestAuctioneerSnapshot
        ? parseFloat(latestAuctioneerSnapshot.targetDecimal) > 0
        : false;

      // Supply impact - sum of (remainingAmount / conversionPrice) for all positions
      const positions = data?.convertibleDepositPositions?.items || [];
      const supplyGrowthOhm = positions.reduce(
        (sum: number, pos: { remainingAmountDecimal: string; conversionPriceDecimal: string }) => {
          const remaining = parseFloat(pos.remainingAmountDecimal) || 0;
          const price = parseFloat(pos.conversionPriceDecimal) || 0;
          if (remaining > 0 && price > 0) return sum + remaining / price;
          return sum;
        },
        0,
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
    staleTime: 10_000,
    refetchInterval: 10_000,
  });
}
