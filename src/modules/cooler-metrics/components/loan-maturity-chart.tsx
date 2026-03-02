import type React from "react";
import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { startOfDay, addDays, differenceInDays, format } from "date-fns";
import { Card } from "@/components/ui/card";
import { useActiveLoans } from "@/lib/hooks/cooler/useV1Data";
import { formatUSD } from "@/lib/hooks/cooler/utils";

const CHART_COLORS = {
  gte121: "var(--green)",
  lt121: "var(--blue)",
  lt30: "var(--yellow)",
  expired: "var(--red)",
  grid: "var(--border-a10)",
  text: "var(--text-secondary)",
} as const;

interface MaturityDataPoint {
  date: string;
  dateLabel: string;
  gte121Days: number;
  lt121Days: number;
  lt30Days: number;
  expired: number;
  gte121DaysValue: number;
  lt121DaysValue: number;
  lt30DaysValue: number;
  expiredValue: number;
}

export const LoanMaturityChart: React.FC = () => {
  const { data: activeLoansData, isLoading } = useActiveLoans();
  const [showValues, setShowValues] = useState(false);

  const chartData = useMemo((): MaturityDataPoint[] => {
    if (!activeLoansData?.pages) return [];

    const allLoans = activeLoansData.pages.flatMap((page) => page.coolerLoans);
    const today = startOfDay(new Date());

    return Array.from({ length: 121 }).map((_, i) => {
      const date = addDays(today, i);

      const categories = allLoans.reduce(
        (acc, loan) => {
          const expiryDate = new Date(parseInt(loan.currentExpiryTimestamp, 10) * 1000);
          const daysFromTodayToExpiry = differenceInDays(expiryDate, today);
          const remainingDays = daysFromTodayToExpiry - i;
          const principal = Number(loan.principal);

          if (remainingDays < 0) {
            acc.expired += 1;
            acc.expiredValue += principal;
          } else if (remainingDays < 30) {
            acc.lt30Days += 1;
            acc.lt30DaysValue += principal;
          } else if (remainingDays < 121) {
            acc.lt121Days += 1;
            acc.lt121DaysValue += principal;
          } else {
            acc.gte121Days += 1;
            acc.gte121DaysValue += principal;
          }

          return acc;
        },
        {
          gte121Days: 0,
          lt121Days: 0,
          lt30Days: 0,
          expired: 0,
          gte121DaysValue: 0,
          lt121DaysValue: 0,
          lt30DaysValue: 0,
          expiredValue: 0,
        },
      );

      return {
        date: date.toISOString().split("T")[0],
        dateLabel: format(date, "MM/dd"),
        ...categories,
      };
    });
  }, [activeLoansData]);

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (!active || !payload || payload.length === 0) return null;
    return (
      <div className="bg-surface-tooltip border border-a10 rounded-xl p-3 shadow-lg">
        <p className="text-xs text-secondary-t mb-2">{label}</p>
        {payload.map((entry) => (
          <p key={entry.name} className="text-sm font-medium" style={{ color: entry.color }}>
            {entry.name}: {showValues ? formatUSD(entry.value) : entry.value}
          </p>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="w-48 h-5 bg-surface-a5 rounded animate-pulse mb-4" />
        <div className="w-full h-[200px] bg-surface-a5 rounded-xl animate-pulse" />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-base font-medium text-secondary-t">Projected Loan Maturities</h3>
        <button
          type="button"
          onClick={() => setShowValues(!showValues)}
          className="text-xs text-secondary-t bg-surface-a5 hover:bg-surface-a10 px-2.5 py-1 rounded-lg transition-colors"
        >
          Show {showValues ? "Counts" : "Values"}
        </button>
      </div>

      {chartData.length === 0 ? (
        <div className="w-full h-[200px] flex items-center justify-center text-secondary-t">
          No active loan data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis
              dataKey="dateLabel"
              stroke={CHART_COLORS.text}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              interval={14}
            />
            <YAxis
              tickFormatter={showValues ? formatCurrency : (v) => v.toString()}
              stroke={CHART_COLORS.text}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={55}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--surface-a5)" }} />
            <Legend
              verticalAlign="top"
              align="right"
              height={24}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11 }}
            />
            <Bar
              dataKey={showValues ? "gte121DaysValue" : "gte121Days"}
              name=">= 121 Days"
              stackId="maturity"
              fill={CHART_COLORS.gte121}
            />
            <Bar
              dataKey={showValues ? "lt121DaysValue" : "lt121Days"}
              name="30-120 Days"
              stackId="maturity"
              fill={CHART_COLORS.lt121}
            />
            <Bar
              dataKey={showValues ? "lt30DaysValue" : "lt30Days"}
              name="< 30 Days"
              stackId="maturity"
              fill={CHART_COLORS.lt30}
            />
            <Bar
              dataKey={showValues ? "expiredValue" : "expired"}
              name="Expired"
              stackId="maturity"
              fill={CHART_COLORS.expired}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};
