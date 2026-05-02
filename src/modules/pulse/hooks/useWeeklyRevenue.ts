import { useMemo } from "react";
import { useReserveYields } from "@/modules/pulse/hooks/useReserveYields";
import { useCoolerMetrics } from "@/modules/pulse/hooks/useCoolerMetrics";
import { useReserveBalances } from "@/modules/pulse/hooks/useReserveBalances";
import { useLpFeesEarned } from "@/modules/pulse/hooks/useLpFeesEarned";
import { useCdStatistics } from "../../../lib/hooks/liveness/useCdStatistics.ts";
import { COOLER_APR } from "@/lib/constants.ts";

export interface RevenueSource {
  name: string;
  weeklyAmount: number;
  color: string;
}

export interface LpBreakdownItem {
  name: string;
  weeklyAmount: number;
  collectedFeesUsd: number;
  uncollectedFeesDeltaUsd: number;
}

export interface WeeklyRevenue {
  totalWeekly: number;
  dailyRate: number;
  sources: RevenueSource[];
  lpBreakdown: LpBreakdownItem[];
}

export function useWeeklyRevenue() {
  const { data: yields } = useReserveYields();
  const { data: cooler } = useCoolerMetrics();
  const { data: reserves } = useReserveBalances();
  const { data: lpFees } = useLpFeesEarned();
  const { data: cd } = useCdStatistics();

  return useMemo<WeeklyRevenue | undefined>(() => {
    if (!yields || !reserves) return undefined;

    // Use actual reserve balances from treasury subgraph
    const susdeWeekly = ((reserves.susdeValue || 0) * ((yields.susdeApy || 0) / 100)) / 52;
    const susdsWeekly = ((reserves.susdsValue || 0) * ((yields.susdsApy || 0) / 100)) / 52;
    const coolerWeekly = cooler ? ((cooler.totalBorrowed || 0) * COOLER_APR) / 52 : 0;
    // CD borrow interest: borrowedAmount * annualRate / 52
    const cdBorrowWeekly = cd ? ((cd.borrowedAmount || 0) * (cd.annualInterestRate || 0)) / 52 : 0;
    // LP fees are actual 7d position-level earned fees from the treasury API:
    // collected fees during the window + change in uncollected/claimable fees.
    // Do not fall back to DeFiLlama pool APRs here; those are benchmark context,
    // not Olympus-owned position revenue.
    const lpFeesWeekly = lpFees?.totalFeesEarnedUsd ?? 0;
    const lpBreakdown: LpBreakdownItem[] = (lpFees?.pools ?? [])
      .map((pool) => ({
        name: pool.name,
        weeklyAmount: pool.feesEarnedUsd,
        collectedFeesUsd: pool.collectedFeesUsd,
        uncollectedFeesDeltaUsd: pool.uncollectedFeesDeltaUsd,
      }))
      .sort((a, b) => b.weeklyAmount - a.weeklyAmount);

    const totalWeekly = susdeWeekly + susdsWeekly + coolerWeekly + cdBorrowWeekly + lpFeesWeekly;

    const sources: RevenueSource[] = [
      {
        name: "sUSDe Yield",
        weeklyAmount: susdeWeekly,
        color: "var(--blue)",
      },
      {
        name: "sUSDS Yield",
        weeklyAmount: susdsWeekly,
        color: "var(--purple)",
      },
      {
        name: "Cooler Interest",
        weeklyAmount: coolerWeekly,
        color: "var(--green)",
      },
      {
        name: "CD Borrow Interest",
        weeklyAmount: cdBorrowWeekly,
        color: "var(--orange)",
      },
      ...(lpFees
        ? [
            {
              name: "7d LP Fees Earned",
              weeklyAmount: lpFeesWeekly,
              color: "var(--yellow)",
            },
          ]
        : []),
    ].sort((a, b) => b.weeklyAmount - a.weeklyAmount);

    return {
      totalWeekly,
      dailyRate: totalWeekly / 7,
      sources,
      lpBreakdown,
    };
  }, [yields, cooler, reserves, lpFees, cd]);
}
