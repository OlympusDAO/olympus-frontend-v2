import type React from "react";
import { useState } from "react";
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
import { Segmented } from "@/components/ui/tabs.tsx";
import { Tooltip as InfoTooltip } from "@/components/ui/tooltip.tsx";
import { RiInformationFill } from "@remixicon/react";
import { useChainId } from "wagmi";
import {
  useConversions,
  useConversionExposure,
  type TimeRange,
} from "@/lib/hooks/cds/useStatisticsData.tsx";
import { summarizeMoneyness } from "@/lib/hooks/cds/conversion-exposure.ts";
import type { ConversionDataPoint } from "@/lib/hooks/cds/cd-conversions.ts";
import { useTokenPrice } from "@/lib/hooks/useTokenPrice.tsx";
import { getTokenAddress, TokenName } from "@/lib/tokens.ts";

/**
 * Buckets are keyed to UTC midnight to match the chain, so the labels have to be
 * rendered in UTC too — formatting them locally shifts the day backwards for anyone
 * west of Greenwich.
 */
const formatUtcAxis = (ms: number) =>
  new Date(ms).toLocaleDateString("en-US", { month: "short", day: "2-digit", timeZone: "UTC" });

const formatUtcFull = (ms: number) =>
  new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

const CHART_COLORS = {
  area: "var(--green)",
  areaFill: "var(--green)",
  grid: "var(--border-a10)",
  text: "var(--text-tertiary)",
} as const;

const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
};

const formatOhm = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(2)}K`;
  return value.toFixed(2);
};

const tabOptions = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "1M" },
  { value: "1y", label: "1Y" },
];

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ConversionDataPoint }>;
}) => {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-surface-tooltip border border-a10-b rounded-2xl px-3 py-2 shadow-[0px_1px_4px_0px_var(--slate-a10)]">
      <p className="text-xs text-secondary-t mb-1.5">{formatUtcFull(data.timestamp)}</p>
      <p className="text-xs font-semibold text-primary-t">
        Converted: {formatCurrency(data.cumulativeConverted)}
      </p>
      <p className="text-xs text-secondary-t mt-0.5">
        {formatOhm(data.cumulativeOhmMinted)} OHM minted
      </p>
    </div>
  );
};

interface StatProps {
  label: string;
  value: string;
  tooltip: string;
}

const Stat: React.FC<StatProps> = ({ label, value, tooltip }) => (
  <div className="flex flex-col gap-0.5">
    <div className="flex items-center gap-1">
      <span className="text-sm text-secondary-t">{label}</span>
      <InfoTooltip title={tooltip}>
        <RiInformationFill size={16} className="text-tertiary-t" />
      </InfoTooltip>
    </div>
    <p className="text-lg font-semibold text-primary-t">{value}</p>
  </div>
);

export const MetricsConversionsChart: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const { data: conversions, isLoading } = useConversions(timeRange);
  const { data: exposure } = useConversionExposure();

  const chainId = useChainId();
  const { price: ohmPrice } = useTokenPrice(chainId, getTokenAddress(TokenName.OHM, chainId));

  const chartData = conversions?.dataPoints ?? [];
  const moneyness = summarizeMoneyness(exposure?.strikes ?? [], ohmPrice);

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="w-40 h-6 bg-surface-a5 rounded animate-pulse" />
          <div className="w-24 h-8 bg-surface-a5 rounded animate-pulse" />
        </div>
        <div className="flex gap-6 mb-4">
          <div className="w-24 h-12 bg-surface-a5 rounded animate-pulse" />
          <div className="w-24 h-12 bg-surface-a5 rounded animate-pulse" />
          <div className="w-24 h-12 bg-surface-a5 rounded animate-pulse" />
        </div>
        <div className="w-full h-[220px] bg-surface-a5 rounded-xl animate-pulse" />
      </Card>
    );
  }

  return (
    <Card className="p-6 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between h-8">
        <h3 className="text-xl font-semibold text-primary-t tracking-[0.2px]">Conversions</h3>
        <Segmented
          value={timeRange}
          onValueChange={(v) => setTimeRange(v as TimeRange)}
          options={tabOptions}
          size="sm"
        />
      </div>

      {/* Stats */}
      <div className="flex gap-6 items-start">
        <Stat
          label="Converted"
          value={formatCurrency(conversions?.totalConverted ?? 0)}
          tooltip="Deposits that have actually converted to OHM and stayed with the treasury. All-time, not limited to the selected period."
        />
        <Stat
          label="OHM Minted"
          value={formatOhm(conversions?.totalOhmMinted ?? 0)}
          tooltip="OHM issued to depositors by those conversions, all-time."
        />
        <Stat
          label="Conversions"
          value={`${conversions?.conversionCount ?? 0}`}
          tooltip="Number of conversion events recorded by the facility, all-time."
        />
      </div>

      {/* Chart */}
      {chartData.length === 0 ? (
        <div className="w-full h-55 flex flex-col items-center justify-center gap-1 text-center">
          <p className="text-sm text-secondary-t">No conversions in this period</p>
          {moneyness.totalCount > 0 && (
            <p className="text-xs text-tertiary-t max-w-xs">
              {moneyness.inTheMoneyCount > 0
                ? `${moneyness.inTheMoneyCount} of ${moneyness.totalCount} positions are in the money — ${formatCurrency(moneyness.inTheMoneyUsd)} could convert at today's price.`
                : `OHM is ${moneyness.breakevenMovePercent.toFixed(1)}% below the average conversion price, so no position is currently worth converting.`}
            </p>
          )}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="conversionsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.areaFill} stopOpacity={0.35} />
                <stop offset="100%" stopColor={CHART_COLORS.areaFill} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatUtcAxis}
              stroke="transparent"
              tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(value) => formatCurrency(value)}
              stroke="transparent"
              tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: CHART_COLORS.text, strokeWidth: 1, strokeDasharray: "4 4" }}
            />
            <Area
              type="monotone"
              dataKey="cumulativeConverted"
              stroke={CHART_COLORS.area}
              fill="url(#conversionsGradient)"
              strokeWidth={2}
              activeDot={{
                r: 4,
                fill: "var(--green)",
                stroke: "var(--surface-bg-l2)",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};
