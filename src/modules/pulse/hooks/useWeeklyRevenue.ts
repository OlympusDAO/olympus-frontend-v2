import { useMemo } from "react";
import { useReserveYields } from "../../../lib/hooks/liveness/useReserveYields.ts";
import { useCoolerMetrics } from "../../../lib/hooks/liveness/useCoolerMetrics.ts";
import { useReserveBalances } from "../../../lib/hooks/liveness/useReserveBalances.ts";
import { useCdStatistics } from "../../../lib/hooks/liveness/useCdStatistics.ts";
import { COOLER_APR } from "@/lib/constants.ts";

export interface RevenueSource {
  name: string;
  weeklyAmount: number;
  color: string;
}

export interface LpBreakdownItem {
  name: string;
  value: number;
  apy: number;
  weeklyAmount: number;
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
  const { data: cd } = useCdStatistics();

  return useMemo<WeeklyRevenue | undefined>(() => {
    if (!yields || !reserves) return undefined;

    // Use actual reserve balances from treasury subgraph
    const susdeWeekly = ((reserves.susdeValue || 0) * ((yields.susdeApy || 0) / 100)) / 52;
    const susdsWeekly = ((reserves.susdsValue || 0) * ((yields.susdsApy || 0) / 100)) / 52;
    const coolerWeekly = cooler ? ((cooler.totalBorrowed || 0) * COOLER_APR) / 52 : 0;
    // CD borrow interest: borrowedAmount * annualRate / 52
    const cdBorrowWeekly = cd ? ((cd.borrowedAmount || 0) * (cd.annualInterestRate || 0)) / 52 : 0;
    // LP fees: sum (position value * DeFiLlama fee APY) for each LP
    let lpFeesWeekly = 0;
    const lpBreakdown: LpBreakdownItem[] = [];
    if (reserves.lpPositions && yields.lpApys) {
      for (const lp of reserves.lpPositions) {
        const apy = yields.lpApys[lp.name] || 0;
        const weekly = ((lp.value || 0) * (apy / 100)) / 52;
        lpFeesWeekly += weekly;
        lpBreakdown.push({
          name: lp.name,
          value: lp.value,
          apy,
          weeklyAmount: weekly,
        });
      }
      lpBreakdown.sort((a, b) => b.weeklyAmount - a.weeklyAmount);
    }

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
      {
        name: "LP Fees",
        weeklyAmount: lpFeesWeekly,
        color: "var(--yellow)",
      },
    ].sort((a, b) => b.weeklyAmount - a.weeklyAmount);

    return {
      totalWeekly,
      dailyRate: totalWeekly / 7,
      sources,
      lpBreakdown,
    };
  }, [yields, cooler, reserves, cd]);
}
