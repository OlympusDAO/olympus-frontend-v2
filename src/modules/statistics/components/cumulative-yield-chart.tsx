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
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip as InfoTooltip } from "@/components/ui/tooltip";
import { RiInformationFill } from "@remixicon/react";
import {
  useStatisticsData,
  useCurrentStatistics,
  type TimeRange,
} from "@/lib/hooks/cds/useStatisticsData";

const CHART_COLORS = {
  area: "var(--purple)",
  areaFill: "var(--purple)",
  grid: "var(--border-a10)",
  text: "var(--text-secondary)",
} as const;

interface YieldDataPoint {
  timestamp: number;
  dateLabel: string;
  cumulativeYield: number;
}

export const CumulativeYieldChart: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  const { data: statisticsData, isLoading } = useStatisticsData(timeRange);
  const { data: currentStats } = useCurrentStatistics();

  // Process claimed yields into cumulative yield over time
  const chartData = useMemo((): YieldDataPoint[] => {
    if (!statisticsData?.claimedYields || statisticsData.claimedYields.length === 0) return [];

    // Sort by timestamp and compute cumulative sum
    const sortedYields = [...statisticsData.claimedYields].sort(
      (a, b) => a.timestamp - b.timestamp,
    );

    // Group by day and sum yields per day
    const dailyMap = new Map<number, number>();

    sortedYields.forEach((claim) => {
      const dayStart = startOfDay(new Date(claim.timestamp * 1000)).getTime();
      const currentAmount = dailyMap.get(dayStart) || 0;
      dailyMap.set(dayStart, currentAmount + parseFloat(claim.amountDecimal));
    });

    // Convert to array, sort by date, and compute cumulative sum
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

  // Calculate total cumulative yield (sum of all claimed yields in period)
  const totalCumulativeYield = useMemo(() => {
    if (!statisticsData?.claimedYields) return 0;
    return statisticsData.claimedYields.reduce(
      (sum, claim) => sum + parseFloat(claim.amountDecimal),
      0,
    );
  }, [statisticsData]);

  // Current claimable yield (not yet claimed)
  const currentClaimableYield = currentStats?.latestSnapshot
    ? parseFloat(currentStats.latestSnapshot.claimableYieldDecimal)
    : 0;

  // Total yield = already claimed + currently claimable
  const totalYield = totalCumulativeYield + currentClaimableYield;

  // Calculate average yield per day from claimed yields
  const avgYieldPerDay = useMemo(() => {
    if (!statisticsData?.claimedYields || statisticsData.claimedYields.length === 0) return 0;

    const sortedYields = [...statisticsData.claimedYields].sort(
      (a, b) => a.timestamp - b.timestamp,
    );
    const firstTimestamp = sortedYields[0].timestamp;
    const lastTimestamp = sortedYields[sortedYields.length - 1].timestamp;

    const daysDiff = (lastTimestamp - firstTimestamp) / (24 * 60 * 60);
    if (daysDiff <= 0) return totalCumulativeYield; // All in one day

    return totalCumulativeYield / daysDiff;
  }, [statisticsData, totalCumulativeYield]);

  // Calculate yield rate (APY approximation)
  const yieldRate = useMemo(() => {
    if (!currentStats?.latestSnapshot) return 0;

    const totalDeposits = parseFloat(currentStats.latestSnapshot.totalDepositedDecimal);
    if (totalDeposits <= 0 || avgYieldPerDay <= 0) return 0;

    // Annual yield rate = (daily yield / total deposits) * 365 * 100
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
      <div className="bg-surface-tooltip border border-a10 rounded-xl p-3 shadow-lg">
        <p className="text-xs text-secondary-t mb-1">
          {format(new Date(data.timestamp), "MMM dd, yyyy")}
        </p>
        <p className="text-sm font-medium">USD Earned: {formatCurrency(data.cumulativeYield)}</p>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="w-32 h-5 bg-surface-a5 rounded animate-pulse mb-2" />
            <div className="w-24 h-8 bg-surface-a5 rounded animate-pulse" />
          </div>
          <div className="w-24 h-8 bg-surface-a5 rounded animate-pulse" />
        </div>
        <div className="w-full h-[200px] bg-surface-a5 rounded-xl animate-pulse" />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <h3 className="text-base font-medium text-secondary-t">Cumulative Yield</h3>
            <InfoTooltip title="Total yield earned by depositors from the underlying yield-bearing assets.">
              <span className="sr-only">Info</span>
            </InfoTooltip>
          </div>
          <div className="flex items-baseline gap-4">
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-secondary-t">Total Yield</span>
                <InfoTooltip title="Sum of all claimed yield in the selected period plus any currently claimable yield.">
                  <RiInformationFill size={14} className="text-tertiary-t" />
                </InfoTooltip>
              </div>
              <p className="text-2xl font-semibold">{formatCurrency(totalYield)}</p>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-secondary-t">Avg. / Day</span>
                <InfoTooltip title="Average daily yield calculated from claimed yields in the selected period.">
                  <RiInformationFill size={14} className="text-tertiary-t" />
                </InfoTooltip>
              </div>
              <p className="text-2xl font-semibold">{formatCurrency(avgYieldPerDay)}</p>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-secondary-t">Yield Rate</span>
                <InfoTooltip title="Annualized yield rate based on average daily yield and total deposits (APY approximation).">
                  <RiInformationFill size={14} className="text-tertiary-t" />
                </InfoTooltip>
              </div>
              <p className="text-2xl font-semibold">{yieldRate.toFixed(2)}%</p>
            </div>
          </div>
        </div>
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
          <TabsList className="h-7">
            <TabsTrigger value="7d" className="text-xs px-2 h-6">
              7D
            </TabsTrigger>
            <TabsTrigger value="30d" className="text-xs px-2 h-6">
              1M
            </TabsTrigger>
            <TabsTrigger value="1y" className="text-xs px-2 h-6">
              1Y
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {chartData.length === 0 ? (
        <div className="w-full h-[200px] flex items-center justify-center text-secondary-t">
          No yield data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <defs>
              <linearGradient id="yieldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.areaFill} stopOpacity={0.3} />
                <stop offset="100%" stopColor={CHART_COLORS.areaFill} stopOpacity={0.05} />
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
              tickFormatter={(value) => formatCurrency(value)}
              stroke={CHART_COLORS.text}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="cumulativeYield"
              stroke={CHART_COLORS.area}
              fill="url(#yieldGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};
