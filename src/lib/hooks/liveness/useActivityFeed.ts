import { useQuery } from "@tanstack/react-query";
import {
  CD_SUBGRAPH_URL,
  BOND_SUBGRAPH_URL,
  COOLER_SUBGRAPH_URL,
  COOLER_APR,
} from "@/lib/constants";

export type ActivityType =
  | "cd-bid"
  | "cd-converted"
  | "cd-yield"
  | "cd-loan"
  | "cd-repay"
  | "cd-redemption"
  | "yrf-purchase"
  | "cooler-borrow"
  | "cooler-repay"
  | "cooler-add-collateral"
  | "cooler-withdraw-collateral"
  | "cooler-liquidation";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  timestamp: number;
  primaryValue: string;
  secondaryValue: string;
  address?: string;
  txHash?: string;
}

const COOLER_TYPE_MAP: Record<string, ActivityType> = {
  borrow: "cooler-borrow",
  repay: "cooler-repay",
  liquidation: "cooler-liquidation",
  collateralAdd: "cooler-add-collateral",
  collateralWithdraw: "cooler-withdraw-collateral",
};

export function useActivityFeed(options?: { refetchInterval?: number | false }) {
  return useQuery<ActivityItem[]>({
    queryKey: ["activityFeed"],
    queryFn: async () => {
      const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;

      const query = `
        query GetActivityFeed {
          convertibleDepositAuctioneerBids(
            where: {
              chainId: 1,
              timestamp_gte: "${thirtyDaysAgo}"
            }
            orderBy: "timestamp"
            orderDirection: "desc"
            limit: 25
          ) {
            items {
              txHash
              timestamp
              depositor
              depositAmountDecimal
              convertedAmountDecimal
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
            limit: 25
          ) {
            items {
              txHash
              timestamp
              depositor
              depositAmountDecimal
              convertedAmountDecimal
            }
          }

          convertibleDepositFacilityClaimedYields(
            where: {
              chainId: 1,
              timestamp_gte: "${thirtyDaysAgo}"
            }
            orderBy: "timestamp"
            orderDirection: "desc"
            limit: 25
          ) {
            items {
              txHash
              timestamp
              amountDecimal
            }
          }

          depositRedemptionVaultLoanCreateds(
            where: {
              chainId: 1,
              timestamp_gte: "${thirtyDaysAgo}"
            }
            orderBy: "timestamp"
            orderDirection: "desc"
            limit: 25
          ) {
            items {
              txHash
              timestamp
              depositor
              amountDecimal
            }
          }

          depositRedemptionVaultLoanRepaids(
            where: {
              chainId: 1,
              timestamp_gte: "${thirtyDaysAgo}"
            }
            orderBy: "timestamp"
            orderDirection: "desc"
            limit: 25
          ) {
            items {
              txHash
              timestamp
              depositor
              principalDecimal
              interestDecimal
            }
          }

          depositRedemptionVaultRedemptionStarteds(
            where: {
              chainId: 1,
              timestamp_gte: "${thirtyDaysAgo}"
            }
            orderBy: "timestamp"
            orderDirection: "desc"
            limit: 25
          ) {
            items {
              txHash
              timestamp
              depositor
              amountDecimal
            }
          }

          depositRedemptionVaultAssetConfigurations(limit: 1) {
            items {
              interestRateDecimal
            }
          }
        }
      `;

      const response = await fetch(CD_SUBGRAPH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) throw new Error("Failed to fetch activity feed");

      const { data, errors } = await response.json();
      if (errors) throw new Error(errors[0]?.message || "Activity feed error");

      const items: ActivityItem[] = [];

      // CD Bids
      for (const bid of data?.convertibleDepositAuctioneerBids?.items || []) {
        items.push({
          id: `bid-${bid.timestamp}-${bid.depositor}`,
          type: "cd-bid",
          timestamp: Number(bid.timestamp),
          primaryValue: `$${parseFloat(bid.depositAmountDecimal).toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
          secondaryValue: `${parseFloat(bid.convertedAmountDecimal).toLocaleString("en-US", { maximumFractionDigits: 1 })} OHM @ $${parseFloat(bid.tickPriceDecimal).toFixed(2)}`,
          address: bid.depositor,
          txHash: bid.txHash || undefined,
        });
      }

      // CD Conversions
      for (const conv of data?.convertibleDepositFacilityConvertedDeposits?.items || []) {
        items.push({
          id: `conv-${conv.timestamp}-${conv.depositor}`,
          type: "cd-converted",
          timestamp: Number(conv.timestamp),
          primaryValue: `$${parseFloat(conv.depositAmountDecimal).toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
          secondaryValue: `→ ${parseFloat(conv.convertedAmountDecimal).toLocaleString("en-US", { maximumFractionDigits: 1 })} OHM`,
          address: conv.depositor,
          txHash: conv.txHash || undefined,
        });
      }

      // Yield Claims
      for (const claim of data?.convertibleDepositFacilityClaimedYields?.items || []) {
        items.push({
          id: `yield-${claim.timestamp}-${claim.txHash}`,
          type: "cd-yield",
          timestamp: Number(claim.timestamp),
          primaryValue: `$${parseFloat(claim.amountDecimal).toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
          secondaryValue: "CD yield claimed",
          txHash: claim.txHash || undefined,
        });
      }

      // CD interest rate (for revenue projections on loans)
      const cdInterestRate =
        parseFloat(
          data?.depositRedemptionVaultAssetConfigurations?.items?.[0]?.interestRateDecimal,
        ) || 0;

      // CD Loans (borrows against deposits)
      for (const loan of data?.depositRedemptionVaultLoanCreateds?.items || []) {
        const loanAmount = parseFloat(loan.amountDecimal) || 0;
        const annualRevenue = loanAmount * cdInterestRate;
        items.push({
          id: `cd-loan-${loan.timestamp}-${loan.depositor}`,
          type: "cd-loan",
          timestamp: Number(loan.timestamp),
          primaryValue: `$${loanAmount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
          secondaryValue:
            annualRevenue > 0
              ? `$${annualRevenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}/yr revenue`
              : "Borrowed against CD",
          address: loan.depositor,
          txHash: loan.txHash || undefined,
        });
      }

      // CD Loan Repayments
      for (const repay of data?.depositRedemptionVaultLoanRepaids?.items || []) {
        const principal = parseFloat(repay.principalDecimal) || 0;
        const interest = parseFloat(repay.interestDecimal) || 0;
        items.push({
          id: `cd-repay-${repay.timestamp}-${repay.depositor}`,
          type: "cd-repay",
          timestamp: Number(repay.timestamp),
          primaryValue: `$${principal.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
          secondaryValue:
            interest > 0
              ? `$${interest.toLocaleString("en-US", { maximumFractionDigits: 0 })} interest`
              : "Loan repaid",
          address: repay.depositor,
          txHash: repay.txHash || undefined,
        });
      }

      // CD Redemptions
      for (const redemption of data?.depositRedemptionVaultRedemptionStarteds?.items || []) {
        items.push({
          id: `cd-redeem-${redemption.timestamp}-${redemption.depositor}`,
          type: "cd-redemption",
          timestamp: Number(redemption.timestamp),
          primaryValue: `$${parseFloat(redemption.amountDecimal).toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
          secondaryValue: "Redemption started",
          address: redemption.depositor,
          txHash: redemption.txHash || undefined,
        });
      }

      // Fetch YRF bond purchases from bond market subgraph
      try {
        const bondQuery = `
          {
            bondPurchases(
              first: 25
              where: { marketId_gte: "650" }
              orderBy: timestamp
              orderDirection: desc
            ) {
              timestamp
              amountInQuoteToken
              payoutInPayoutToken
              marketId
              transaction
            }
          }
        `;
        const bondResponse = await fetch(BOND_SUBGRAPH_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: bondQuery }),
        });
        if (bondResponse.ok) {
          const bondJson = await bondResponse.json();
          for (const purchase of bondJson.data?.bondPurchases ?? []) {
            const ohmAmount = parseFloat(purchase.amountInQuoteToken) || 0;
            const usdPayout = parseFloat(purchase.payoutInPayoutToken) || 0;
            items.push({
              id: `yrf-${purchase.transaction}-${purchase.marketId}`,
              type: "yrf-purchase",
              timestamp: Math.round(Number(purchase.timestamp) / 1000),
              primaryValue: `${ohmAmount.toLocaleString("en-US", { maximumFractionDigits: 1 })} OHM`,
              secondaryValue: `$${usdPayout.toLocaleString("en-US", { maximumFractionDigits: 0 })} via Market #${purchase.marketId}`,
              txHash: purchase.transaction || undefined,
            });
          }
        }
      } catch {
        // Bond purchase data is non-critical for the feed
      }

      // Fetch Cooler (MonoCooler V2) activity
      try {
        const coolerQuery = `
          {
            monoCoolerActivities(
              first: 25
              orderBy: timestamp
              orderDirection: desc
            ) {
              id
              type
              account { address }
              amount
              collateral
              debt
              txHash
              timestamp
            }
          }
        `;
        const coolerResponse = await fetch(COOLER_SUBGRAPH_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: coolerQuery }),
        });
        if (coolerResponse.ok) {
          const coolerJson = await coolerResponse.json();
          for (const activity of coolerJson.data?.monoCoolerActivities ?? []) {
            const activityType = COOLER_TYPE_MAP[activity.type];
            if (!activityType) continue;

            // `amount` is WAD (18 decimals) and represents the TX delta:
            //   borrow/repay → DAI amount, collateralAdd/Withdraw → gOHM amount
            // `collateral` and `debt` are TOTAL position values (not deltas)
            const amount = parseFloat(activity.amount) / 1e18;
            const totalDebt = activity.debt ? parseFloat(activity.debt) / 1e18 : 0;

            let primaryValue: string;
            let secondaryValue: string;

            if (activityType === "cooler-borrow") {
              const annualRevenue = amount * COOLER_APR;
              primaryValue = `$${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
              secondaryValue = `$${annualRevenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}/yr revenue`;
            } else if (activityType === "cooler-repay") {
              primaryValue = `$${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
              secondaryValue =
                totalDebt > 0
                  ? `$${totalDebt.toLocaleString("en-US", { maximumFractionDigits: 0 })} remaining`
                  : "DAI repaid";
            } else if (activityType === "cooler-add-collateral") {
              primaryValue = `${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })} gOHM`;
              secondaryValue = "Collateral added";
            } else if (activityType === "cooler-withdraw-collateral") {
              primaryValue = `${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })} gOHM`;
              secondaryValue = "Collateral withdrawn";
            } else {
              // liquidation
              primaryValue = `$${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
              secondaryValue = "Liquidated";
            }

            items.push({
              id: `cooler-${activity.id}`,
              type: activityType,
              timestamp: Number(activity.timestamp),
              primaryValue,
              secondaryValue,
              address: activity.account?.address || undefined,
              txHash: activity.txHash || undefined,
            });
          }
        }
      } catch {
        // Cooler data is non-critical for the feed
      }

      // Sort by timestamp descending
      items.sort((a, b) => b.timestamp - a.timestamp);

      return items.slice(0, 100);
    },
    staleTime: 30_000,
    refetchInterval: options?.refetchInterval ?? 60_000,
  });
}
