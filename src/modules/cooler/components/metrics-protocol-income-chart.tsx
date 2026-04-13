import type React from "react";
import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/card.tsx";
import { NumberFlow } from "@/components/ui/number-flow.tsx";
import { useProtocolIncome } from "@/lib/hooks/cooler/useV1Data.ts";
import type { Format } from "@number-flow/react";

const CHART_COLORS = {
  interest: "var(--blue)",
  defaults: "var(--green)",
  grid: "var(--border-a10)",
  text: "var(--text-secondary)",
} as const;

const USD_COMPACT: Format = {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
};

const USD_FULL: Format = {
  style: "currency",
  currency: "USD",
  notation: "standard",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
};

function formatTimestamp(timestamp: string): string {
  try {
    const timestampNum = Number(timestamp);
    if (Number.isNaN(timestampNum) || timestampNum <= 0) return "";
    const date = new Date(timestampNum / 1000);
    if (date.toString() === "Invalid Date") return "";
    return date.toISOString().split("T")[0];
  } catch {
    return "";
  }
}

function formatDateLabel(dateStr: string): string {
  const parts = dateStr.split("-");
  return `${parts[1]}/${parts[2]}`;
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

interface IncomeDataPoint {
  date: string;
  dateLabel: string;
  interest: number;
  income: number;
}

function InterestTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: IncomeDataPoint }>;
}) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-surface-tooltip shadow-tooltip rounded-[20px] px-3 py-2 text-sm">
      <p className="text-secondary-t mb-1">{d.date}</p>
      <div className="flex justify-between gap-4">
        <span className="font-medium" style={{ color: CHART_COLORS.interest }}>
          Interest
        </span>
        <NumberFlow value={d.interest} format={USD_COMPACT} />
      </div>
    </div>
  );
}

function DefaultTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: IncomeDataPoint }>;
}) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-surface-tooltip shadow-tooltip rounded-[20px] px-3 py-2 text-sm">
      <p className="text-secondary-t mb-1">{d.date}</p>
      <div className="flex justify-between gap-4">
        <span className="font-medium" style={{ color: CHART_COLORS.defaults }}>
          Default Income
        </span>
        <NumberFlow value={d.income} format={USD_COMPACT} />
      </div>
    </div>
  );
}

export const ProtocolIncomeChart: React.FC = () => {
  const { data, isLoading } = useProtocolIncome();

  const { chartData, cumulativeDefaultIncome, cumulativeInterestIncome } = useMemo(() => {
    if (!data) {
      return {
        chartData: [] as IncomeDataPoint[],
        cumulativeDefaultIncome: 0,
        cumulativeInterestIncome: 0,
      };
    }

    const combinedData = new Map<
      string,
      {
        timestamp: string;
        totalValueClaimed: string;
        totalPrincipalDefaulted: string;
        totalNewInterest: string;
        totalInterestPaid: string;
      }
    >();

    let cumDefaultIncome = 0;
    let cumInterestIncome = 0;

    data.defaultStats_collection.forEach((item) => {
      if (!item.timestamp) return;
      const defaultIncome =
        parseFloat(item.totalValueClaimed || "0") - parseFloat(item.totalPrincipalDefaulted || "0");
      cumDefaultIncome += defaultIncome;

      combinedData.set(item.timestamp, {
        timestamp: item.timestamp,
        totalValueClaimed: item.totalValueClaimed,
        totalPrincipalDefaulted: item.totalPrincipalDefaulted,
        totalNewInterest: "0",
        totalInterestPaid: "0",
      });
    });

    data.extensionStats_collection.forEach((item) => {
      if (!item.timestamp) return;
      cumInterestIncome += parseFloat(item.totalNewInterest || "0");
      const existing = combinedData.get(item.timestamp) || {
        timestamp: item.timestamp,
        totalValueClaimed: "0",
        totalPrincipalDefaulted: "0",
        totalInterestPaid: "0",
        totalNewInterest: "0",
      };
      combinedData.set(item.timestamp, { ...existing, totalNewInterest: item.totalNewInterest });
    });

    data.repaymentStats_collection.forEach((item) => {
      if (!item.timestamp) return;
      cumInterestIncome += parseFloat(item.totalInterestPaid || "0");
      const existing = combinedData.get(item.timestamp) || {
        timestamp: item.timestamp,
        totalValueClaimed: "0",
        totalPrincipalDefaulted: "0",
        totalNewInterest: "0",
        totalInterestPaid: "0",
      };
      combinedData.set(item.timestamp, { ...existing, totalInterestPaid: item.totalInterestPaid });
    });

    const processed = Array.from(combinedData.values())
      .filter((item) => item.timestamp)
      .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
      .map((item) => {
        const date = formatTimestamp(item.timestamp);
        const totalInterest =
          parseFloat(item.totalNewInterest) + parseFloat(item.totalInterestPaid);
        const income =
          parseFloat(item.totalValueClaimed) - parseFloat(item.totalPrincipalDefaulted);
        return {
          date,
          dateLabel: date ? formatDateLabel(date) : "",
          interest: totalInterest,
          income,
        };
      })
      .filter((item) => item.date);

    return {
      chartData: processed,
      cumulativeDefaultIncome: cumDefaultIncome,
      cumulativeInterestIncome: cumInterestIncome,
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="flex flex-col gap-1 px-6 py-5">
              <div className="w-32 h-4 bg-surface-a5 rounded animate-pulse" />
              <div className="w-24 h-6 bg-surface-a5 rounded animate-pulse" />
              <div className="w-40 h-3 bg-surface-a5 rounded animate-pulse" />
            </Card>
          ))}
        </div>
        <Card className="px-6 py-5">
          <div className="w-40 h-5 bg-surface-a5 rounded animate-pulse mb-4" />
          <div className="w-full h-50 bg-surface-a5 rounded-xl animate-pulse" />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Summary stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="flex flex-col gap-1 px-6 py-5">
          <span className="text-base text-secondary-t">Total Default Income</span>
          <NumberFlow
            className="text-xl/[24px] font-semibold tracking-[0.2px]"
            value={cumulativeDefaultIncome}
            format={USD_FULL}
          />
          <span className="text-xs text-tertiary-t">Claimed value minus defaulted principal</span>
        </Card>
        <Card className="flex flex-col gap-1 px-6 py-5">
          <span className="text-base text-secondary-t">Total Interest Income</span>
          <NumberFlow
            className="text-xl/[24px] font-semibold tracking-[0.2px]"
            value={cumulativeInterestIncome}
            format={USD_FULL}
          />
          <span className="text-xs text-tertiary-t">From extensions and repayments</span>
        </Card>
      </div>

      {/* Two separate charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="px-6 py-5">
          <h3 className="text-base font-medium text-secondary-t mb-4">Interest Income</h3>
          {chartData.length === 0 ? (
            <div className="w-full h-50 flex items-center justify-center text-secondary-t">
              No data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <defs>
                  <linearGradient id="interestIncomeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.interest} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={CHART_COLORS.interest} stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis
                  dataKey="dateLabel"
                  stroke={CHART_COLORS.text}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={formatCurrency}
                  stroke={CHART_COLORS.text}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={55}
                />
                <Tooltip cursor={{ fill: "var(--surface-a5)" }} content={InterestTooltip} />
                <Bar
                  dataKey="interest"
                  fill="url(#interestIncomeGradient)"
                  stroke={CHART_COLORS.interest}
                  strokeWidth={1}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="px-6 py-5">
          <h3 className="text-base font-medium text-secondary-t mb-4">Default Income</h3>
          {chartData.length === 0 ? (
            <div className="w-full h-50 flex items-center justify-center text-secondary-t">
              No data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <defs>
                  <linearGradient id="defaultIncomeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.defaults} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={CHART_COLORS.defaults} stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis
                  dataKey="dateLabel"
                  stroke={CHART_COLORS.text}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={formatCurrency}
                  stroke={CHART_COLORS.text}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={55}
                />
                <Tooltip cursor={{ fill: "var(--surface-a5)" }} content={DefaultTooltip} />
                <Bar
                  dataKey="income"
                  fill="url(#defaultIncomeGradient)"
                  stroke={CHART_COLORS.defaults}
                  strokeWidth={1}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
};
