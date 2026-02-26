import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/card";
import { useProtocolIncome } from "@/lib/hooks/cooler/useV1Data";
import { formatUSD } from "@/lib/hooks/cooler/utils";

const CHART_COLORS = {
  interest: "var(--blue)",
  defaults: "var(--green)",
  grid: "var(--border-a10)",
  text: "var(--text-secondary)",
} as const;

function formatTimestamp(timestamp: string): string {
  try {
    const timestampNum = Number(timestamp);
    if (isNaN(timestampNum) || timestampNum <= 0) return "";
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

interface IncomeDataPoint {
  date: string;
  dateLabel: string;
  interest: number;
  income: number;
}

export const ProtocolIncomeChart: React.FC = () => {
  const { data, isLoading } = useProtocolIncome();

  const { chartData, cumulativeDefaultIncome, cumulativeInterestIncome } = useMemo(() => {
    if (!data) {
      return { chartData: [] as IncomeDataPoint[], cumulativeDefaultIncome: 0, cumulativeInterestIncome: 0 };
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

    // Merge default stats
    data.defaultStats_collection.forEach((item) => {
      if (!item.timestamp) return;
      const defaultIncome =
        parseFloat(item.totalValueClaimed || "0") -
        parseFloat(item.totalPrincipalDefaulted || "0");
      cumDefaultIncome += defaultIncome;

      combinedData.set(item.timestamp, {
        timestamp: item.timestamp,
        totalValueClaimed: item.totalValueClaimed,
        totalPrincipalDefaulted: item.totalPrincipalDefaulted,
        totalNewInterest: "0",
        totalInterestPaid: "0",
      });
    });

    // Merge extension stats
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
      combinedData.set(item.timestamp, {
        ...existing,
        totalNewInterest: item.totalNewInterest,
      });
    });

    // Merge repayment stats
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
      combinedData.set(item.timestamp, {
        ...existing,
        totalInterestPaid: item.totalInterestPaid,
      });
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

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="p-6">
              <div className="w-32 h-4 bg-surface-a5 rounded animate-pulse mb-3" />
              <div className="w-24 h-8 bg-surface-a5 rounded animate-pulse" />
            </Card>
          ))}
        </div>
        <Card className="p-6">
          <div className="w-40 h-5 bg-surface-a5 rounded animate-pulse mb-4" />
          <div className="w-full h-[200px] bg-surface-a5 rounded-xl animate-pulse" />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Summary stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <span className="text-sm text-secondary-t">Total Default Income</span>
          <p className="text-2xl font-semibold mt-1">
            {formatUSD(cumulativeDefaultIncome)}
          </p>
          <span className="text-xs text-tertiary-t">
            Claimed value minus defaulted principal
          </span>
        </Card>
        <Card className="p-6">
          <span className="text-sm text-secondary-t">Total Interest Income</span>
          <p className="text-2xl font-semibold mt-1">
            {formatUSD(cumulativeInterestIncome)}
          </p>
          <span className="text-xs text-tertiary-t">
            From extensions and repayments
          </span>
        </Card>
      </div>

      {/* Two separate charts so each has its own scale */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Interest Income Chart */}
        <Card className="p-6">
          <h3 className="text-base font-medium text-secondary-t mb-4">Interest Income</h3>
          {chartData.length === 0 ? (
            <div className="w-full h-[200px] flex items-center justify-center text-secondary-t">
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
                <XAxis dataKey="dateLabel" stroke={CHART_COLORS.text} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={formatCurrency} stroke={CHART_COLORS.text} fontSize={11} tickLine={false} axisLine={false} width={55} />
                <Tooltip
                  cursor={{ fill: "var(--surface-a5)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const d = payload[0].payload as IncomeDataPoint;
                    return (
                      <div className="bg-surface-tooltip border border-a10 rounded-xl p-3 shadow-lg">
                        <p className="text-xs text-secondary-t mb-1">{d.date}</p>
                        <p className="text-sm font-medium" style={{ color: CHART_COLORS.interest }}>
                          Interest: {formatUSD(d.interest)}
                        </p>
                      </div>
                    );
                  }}
                />
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

        {/* Default Income Chart */}
        <Card className="p-6">
          <h3 className="text-base font-medium text-secondary-t mb-4">Default Income</h3>
          {chartData.length === 0 ? (
            <div className="w-full h-[200px] flex items-center justify-center text-secondary-t">
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
                <XAxis dataKey="dateLabel" stroke={CHART_COLORS.text} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={formatCurrency} stroke={CHART_COLORS.text} fontSize={11} tickLine={false} axisLine={false} width={55} />
                <Tooltip
                  cursor={{ fill: "var(--surface-a5)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const d = payload[0].payload as IncomeDataPoint;
                    return (
                      <div className="bg-surface-tooltip border border-a10 rounded-xl p-3 shadow-lg">
                        <p className="text-xs text-secondary-t mb-1">{d.date}</p>
                        <p className="text-sm font-medium" style={{ color: CHART_COLORS.defaults }}>
                          Default Income: {formatUSD(d.income)}
                        </p>
                      </div>
                    );
                  }}
                />
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
