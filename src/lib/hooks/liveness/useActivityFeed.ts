import { useQuery } from "@tanstack/react-query";
import {
  getBondsPurchases,
  getConvertibleDepositsActivity,
  getCoolerDefaultedLoanEvents,
  getCoolerMonocoolerActivity,
} from "@/generated/indexer";
import { COOLER_APR } from "@/lib/constants";

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
  | "cooler-liquidation"
  | "cooler-v1-default";

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

      // The CD half of the feed. Seven Ponder roots — bids, conversions,
      // claimed yield, redemption loans created and repaid, redemptions
      // started, and the interest-rate config the feed annotates loans with —
      // in one request. The route exists for this hook.
      const { data } = await getConvertibleDepositsActivity({
        sinceTimestamp: String(thirtyDaysAgo),
        limit: 25,
      });

      const items: ActivityItem[] = [];

      // CD Bids
      for (const bid of data.bids) {
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
      for (const conv of data.convertedDeposits) {
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
      for (const claim of data.claimedYields) {
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
        Number.parseFloat(data.redemptionConfig?.interestRateDecimal ?? "") || 0;

      // CD Loans (borrows against deposits)
      for (const loan of data.loansCreated) {
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
      for (const repay of data.loansRepaid) {
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
      for (const redemption of data.redemptionsStarted) {
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
        // `marketIdGte` is the route's own filter; the subgraph needed it
        // interpolated into a where clause.
        const { data: bondPurchases } = await getBondsPurchases({
          marketIdGte: "650",
          order: "desc",
          limit: 25,
        });
        for (const purchase of bondPurchases) {
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
      } catch {
        // Bond purchase data is non-critical for the feed
      }

      // Fetch Cooler activity: MonoCooler V2 plus Cooler V1 defaults
      try {
        // Two routes rather than one document: MonoCooler activity and the
        // defaulted-collateral claims, both newest first.
        const [{ data: coolerActivities }, { data: defaultedClaims }] = await Promise.all([
          getCoolerMonocoolerActivity({ limit: 25 }),
          // No `order`: the route is newest-first by construction and rejects
          // the parameter. Passing it 400d, and the catch below swallowed it —
          // which silently removed the whole cooler section from the feed.
          getCoolerDefaultedLoanEvents({ sinceTimestamp: String(thirtyDaysAgo), limit: 25 }),
        ]);
        for (const activity of coolerActivities) {
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

        for (const defaultEvent of defaultedClaims) {
          const defaultedPrincipal = parseFloat(defaultEvent.defaultedPrincipal) || 0;
          const collateralClaimed = parseFloat(defaultEvent.collateralQuantityClaimed) || 0;
          const collateralValueClaimed = parseFloat(defaultEvent.collateralValueClaimed) || 0;

          items.push({
            id: `cooler-v1-default-${defaultEvent.id}`,
            type: "cooler-v1-default",
            timestamp: Number(defaultEvent.blockTimestamp),
            primaryValue: `$${defaultedPrincipal.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
            secondaryValue:
              collateralValueClaimed > 0
                ? `${collateralClaimed.toLocaleString("en-US", { maximumFractionDigits: 2 })} gOHM claimed ($${collateralValueClaimed.toLocaleString("en-US", { maximumFractionDigits: 0 })})`
                : `${collateralClaimed.toLocaleString("en-US", { maximumFractionDigits: 2 })} gOHM claimed`,
            address: defaultEvent.loan?.borrower?.id || undefined,
            txHash: defaultEvent.transactionHash || undefined,
          });
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
