import type React from "react";
import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, startOfDay } from "date-fns";
import { Card } from "@/components/ui/card.tsx";
import { Segmented } from "@/components/ui/tabs.tsx";
import { Tooltip as InfoTooltip } from "@/components/ui/tooltip.tsx";
import { RiInformationFill } from "@remixicon/react";
import {
  useStatisticsData,
  useCurrentStatistics,
  type TimeRange,
} from "@/lib/hooks/cds/useStatisticsData.tsx";

const CHART_COLORS = {
  area: "var(--purple)",
  areaFill: "var(--purple)",
  grid: "var(--border-a10)",
  text: "var(--text-tertiary)",
} as const;

interface YieldDataPoint {
  timestamp: number;
  dateLabel: string;
  cumulativeYield: number;
}

export const MetricsCumulativeYieldChart: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  const { data: statisticsData, isLoading } = useStatisticsData(timeRange);
  const { data: currentStats } = useCurrentStatistics();

  const chartData = useMemo((): YieldDataPoint[] => {
    if (!statisticsData?.claimedYields || statisticsData.claimedYields.length === 0) return [];

    const sortedYields = [...statisticsData.claimedYields].sort(
      (a, b) => a.timestamp - b.timestamp,
    );

    const dailyMap = new Map<number, number>();

    sortedYields.forEach((claim) => {
      const dayStart = startOfDay(new Date(claim.timestamp * 1000)).getTime();
      const currentAmount = dailyMap.get(dayStart) || 0;
      dailyMap.set(dayStart, currentAmount + parseFloat(claim.amountDecimal));
    });

    const dailyEntries = Array.from(dailyMap.entries()).sort((a, b) => a[0] - b[0]);

    let cumulative = 0;
    return dailyEntries.map(([date, amount]) => {
      cumulative += amount;
      return {
        timestamp: date,
        dateLabel: format(new Date(date), "MMM dd"),
        cumulativeYield: cumulative,
      };
    });
  }, [statisticsData]);

  const totalCumulativeYield = useMemo(() => {
    if (!statisticsData?.claimedYields) return 0;
    return statisticsData.claimedYields.reduce(
      (sum, claim) => sum + parseFloat(claim.amountDecimal),
      0,
    );
  }, [statisticsData]);

  const currentClaimableYield = currentStats?.latestSnapshot
    ? parseFloat(currentStats.latestSnapshot.claimableYieldDecimal)
    : 0;

  const totalYield = totalCumulativeYield + currentClaimableYield;

  const avgYieldPerDay = useMemo(() => {
    if (!statisticsData?.claimedYields || statisticsData.claimedYields.length === 0) return 0;

    const sortedYields = [...statisticsData.claimedYields].sort(
      (a, b) => a.timestamp - b.timestamp,
    );
    const firstTimestamp = sortedYields[0].timestamp;
    const lastTimestamp = sortedYields[sortedYields.length - 1].timestamp;

    const daysDiff = (lastTimestamp - firstTimestamp) / (24 * 60 * 60);
    if (daysDiff <= 0) return totalCumulativeYield;

    return totalCumulativeYield / daysDiff;
  }, [statisticsData, totalCumulativeYield]);

  const yieldRate = useMemo(() => {
    if (!currentStats?.latestSnapshot) return 0;

    const totalDeposits = parseFloat(currentStats.latestSnapshot.totalDepositedDecimal);
    if (totalDeposits <= 0 || avgYieldPerDay <= 0) return 0;

    return (avgYieldPerDay / totalDeposits) * 365 * 100;
  }, [currentStats, avgYieldPerDay]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: YieldDataPoint }>;
  }) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-surface-tooltip border border-a10-b rounded-2xl px-3 py-2 shadow-[0px_1px_4px_0px_var(--slate-a10)]">
        <p className="text-xs text-secondary-t mb-1.5">
          {format(new Date(data.timestamp), "MMM d, yyyy")}
        </p>
        <p className="text-xs font-semibold text-primary-t">
          USD Earned: {formatCurrency(data.cumulativeYield)}
        </p>
      </div>
    );
  };

  const tabOptions = [
    { value: "7d", label: "7D" },
    { value: "30d", label: "1M" },
    { value: "1y", label: "1Y" },
  ];

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
        <h3 className="text-xl font-semibold text-primary-t tracking-[0.2px]">Cumulative Yield</h3>
        <Segmented
          value={timeRange}
          onValueChange={(v) => setTimeRange(v as TimeRange)}
          options={tabOptions}
          size="sm"
        />
      </div>

      {/* Stats */}
      <div className="flex gap-6 items-start">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1">
            <span className="text-sm text-secondary-t">Total Yield</span>
            <InfoTooltip title="Sum of all claimed yield in the selected period plus any currently claimable yield.">
              <RiInformationFill size={16} className="text-tertiary-t" />
            </InfoTooltip>
          </div>
          <p className="text-lg font-semibold text-primary-t">{formatCurrency(totalYield)}</p>
        </div>

        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1">
            <span className="text-sm text-secondary-t">Avg. / Day</span>
            <InfoTooltip title="Average daily yield calculated from claimed yields in the selected period.">
              <RiInformationFill size={16} className="text-tertiary-t" />
            </InfoTooltip>
          </div>
          <p className="text-lg font-semibold text-primary-t">{formatCurrency(avgYieldPerDay)}</p>
        </div>

        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1">
            <span className="text-sm text-secondary-t">Yield Rate</span>
            <InfoTooltip title="Annualized yield rate based on average daily yield and total deposits (APY approximation).">
              <RiInformationFill size={16} className="text-tertiary-t" />
            </InfoTooltip>
          </div>
          <p className="text-lg font-semibold text-primary-t">{yieldRate.toFixed(2)}%</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length === 0 ? (
        <div className="w-full h-55 flex items-center justify-center text-secondary-t text-sm">
          No yield data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="yieldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.areaFill} stopOpacity={0.35} />
                <stop offset="100%" stopColor={CHART_COLORS.areaFill} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis
              dataKey="dateLabel"
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
              dataKey="cumulativeYield"
              stroke={CHART_COLORS.area}
              fill="url(#yieldGradient)"
              strokeWidth={2}
              activeDot={{
                r: 4,
                fill: "var(--purple)",
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
