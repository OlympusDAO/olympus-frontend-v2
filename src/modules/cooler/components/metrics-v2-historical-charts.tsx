import type React from "react";
import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/card.tsx";
import { useV2HistoricalData } from "@/lib/hooks/cooler/useV2Data.ts";
import { formatUSD, formatGOHM, formatPercentage } from "@/lib/hooks/cooler/utils.ts";

const CHART_COLORS = {
  grid: "var(--border-a10)",
  text: "var(--text-secondary)",
} as const;

const SERIES_COLORS = {
  collateral: "var(--blue)",
  debt: "var(--purple)",
  ltv: "var(--green)",
  interestRate: "var(--yellow)",
} as const;

interface ProcessedDataPoint {
  date: string;
  totalCollateral: number;
  totalDebt: number;
  maxOriginationLtv: number;
  interestRate: number;
}

function formatDate(timestamp: number): string {
  try {
    if (Number.isNaN(timestamp) || timestamp <= 0) return "";
    const date = new Date(timestamp / 1000);
    if (date.toString() === "Invalid Date") return "";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function formatDateFull(timestamp: number): string {
  try {
    if (Number.isNaN(timestamp) || timestamp <= 0) return "";
    const date = new Date(timestamp / 1000);
    if (date.toString() === "Invalid Date") return "";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function formatGOHMCompact(value: number): string {
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

interface ChartCardProps {
  title: string;
  gradientId: string;
  color: string;
  dataKey: keyof ProcessedDataPoint;
  yFormatter: (value: number) => string;
  tooltipFormatter: (value: number) => string;
  data: ProcessedDataPoint[];
}

const ChartCard: React.FC<ChartCardProps> = ({
  title,
  gradientId,
  color,
  dataKey,
  yFormatter,
  tooltipFormatter,
  data,
}) => {
  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: ProcessedDataPoint }>;
  }) => {
    if (!active || !payload || payload.length === 0) return null;
    const point = payload[0].payload;
    return (
      <div className="bg-surface-tooltip border border-a10 rounded-xl p-3 shadow-lg">
        <p className="text-xs text-secondary-t mb-1">{point.date}</p>
        <p className="text-sm font-medium">{tooltipFormatter(point[dataKey] as number)}</p>
      </div>
    );
  };

  return (
    <Card className="px-6 py-5">
      <h3 className="text-base font-medium text-secondary-t mb-4">{title}</h3>
      {data.length === 0 ? (
        <div className="w-full h-[200px] flex items-center justify-center text-secondary-t">
          No data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis
              dataKey="date"
              stroke={CHART_COLORS.text}
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={yFormatter}
              stroke={CHART_COLORS.text}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={55}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              fill={`url(#${gradientId})`}
              strokeWidth={2}
              activeDot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};

export const MetricsV2HistoricalCharts: React.FC = () => {
  const { data, isLoading } = useV2HistoricalData(150);

  const chartData = useMemo((): ProcessedDataPoint[] => {
    if (!data) return [];
    return data
      .map((point) => ({
        date: formatDate(point.timestamp),
        dateFull: formatDateFull(point.timestamp),
        totalCollateral: point.totalCollateral,
        totalDebt: point.totalDebt,
        maxOriginationLtv: point.maxOriginationLtv,
        interestRate: point.interestRate,
      }))
      .filter((point) => point.date)
      .reverse();
  }, [data]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="px-6 py-5">
            <div className="w-40 h-5 bg-surface-a5 rounded animate-pulse mb-4" />
            <div className="w-full h-[200px] bg-surface-a5 rounded-xl animate-pulse" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartCard
        title="V2 Collateral Over Time"
        gradientId="v2CollateralGradient"
        color={SERIES_COLORS.collateral}
        dataKey="totalCollateral"
        yFormatter={formatGOHMCompact}
        tooltipFormatter={(v) => `${formatGOHM(v)} gOHM`}
        data={chartData}
      />
      <ChartCard
        title="V2 Debt Over Time"
        gradientId="v2DebtGradient"
        color={SERIES_COLORS.debt}
        dataKey="totalDebt"
        yFormatter={formatCurrency}
        tooltipFormatter={formatUSD}
        data={chartData}
      />
      <ChartCard
        title="V2 LTV Over Time (USDS per gOHM)"
        gradientId="v2LtvGradient"
        color={SERIES_COLORS.ltv}
        dataKey="maxOriginationLtv"
        yFormatter={formatCurrency}
        tooltipFormatter={formatUSD}
        data={chartData}
      />
      <ChartCard
        title="V2 Interest Rate Over Time"
        gradientId="v2InterestRateGradient"
        color={SERIES_COLORS.interestRate}
        dataKey="interestRate"
        yFormatter={(v) => `${v.toFixed(1)}%`}
        tooltipFormatter={formatPercentage}
        data={chartData}
      />
    </div>
  );
};
