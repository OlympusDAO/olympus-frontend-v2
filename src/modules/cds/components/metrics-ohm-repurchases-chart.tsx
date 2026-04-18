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
  ReferenceLine,
} from "recharts";
import { format, startOfDay } from "date-fns";
import { Card } from "@/components/ui/card.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Tooltip as InfoTooltip } from "@/components/ui/tooltip.tsx";
import { RiInformationFill } from "@remixicon/react";
import {
  useStatisticsData,
  useCurrentStatistics,
  type TimeRange,
} from "@/lib/hooks/cds/useStatisticsData.tsx";
import { useToken } from "@/lib/hooks/useToken.tsx";
import { TokenName } from "@/lib/tokens.ts";

const CHART_COLORS = {
  barGradientStart: "var(--blue)",
  avgLine: "var(--blue)",
  grid: "var(--border-a10)",
  text: "var(--text-secondary)",
} as const;

interface DailyRepurchase {
  date: number;
  dateLabel: string;
  ohmAmount: number;
}

export const MetricsOhmRepurchasesChart: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  const { data: statisticsData, isLoading: isLoadingStats } = useStatisticsData(timeRange);
  const { data: currentStats } = useCurrentStatistics();
  const OHMToken = useToken(TokenName.OHM);
  const ohmPriceNumber = OHMToken.price;

  const isLoading = isLoadingStats;

  // Calculate total claimed yield in period
  const totalClaimedYield = useMemo(() => {
    if (!statisticsData?.claimedYields || statisticsData.claimedYields.length === 0) return 0;
    return statisticsData.claimedYields.reduce(
      (sum, claim) => sum + parseFloat(claim.amountDecimal),
      0,
    );
  }, [statisticsData]);

  // Calculate average yield per day from claimed yields
  const avgYieldPerDay = useMemo(() => {
    if (!statisticsData?.claimedYields || statisticsData.claimedYields.length === 0) return 0;

    const sortedYields = [...statisticsData.claimedYields].sort(
      (a, b) => a.timestamp - b.timestamp,
    );
    const firstTimestamp = sortedYields[0].timestamp;
    const lastTimestamp = sortedYields[sortedYields.length - 1].timestamp;

    const daysDiff = (lastTimestamp - firstTimestamp) / (24 * 60 * 60);
    if (daysDiff <= 0) return totalClaimedYield; // All in one day

    return totalClaimedYield / daysDiff;
  }, [statisticsData, totalClaimedYield]);

  // Process claimed yields into daily OHM repurchase amounts
  const chartData = useMemo((): DailyRepurchase[] => {
    if (
      !statisticsData?.claimedYields ||
      statisticsData.claimedYields.length === 0 ||
      ohmPriceNumber <= 0
    )
      return [];

    // Group claimed yields by day
    const dailyMap = new Map<number, number>();

    statisticsData.claimedYields.forEach((claim) => {
      const dayStart = startOfDay(new Date(claim.timestamp * 1000)).getTime();
      const currentAmount = dailyMap.get(dayStart) || 0;
      dailyMap.set(dayStart, currentAmount + parseFloat(claim.amountDecimal));
    });

    // Convert to array, sort by date, and convert yield to OHM
    return Array.from(dailyMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([date, yieldAmount]) => ({
        date,
        dateLabel: format(new Date(date), "MMM dd"),
        ohmAmount: yieldAmount / ohmPriceNumber,
      }));
  }, [statisticsData, ohmPriceNumber]);

  // Current claimable yield (not yet claimed)
  const currentClaimableYield = currentStats?.latestSnapshot
    ? parseFloat(currentStats.latestSnapshot.claimableYieldDecimal)
    : 0;

  // Expected total = already claimed in period + currently claimable
  const expectedTotalYield = totalClaimedYield + currentClaimableYield;

  const expectedTotalOhm = ohmPriceNumber > 0 ? expectedTotalYield / ohmPriceNumber : 0;
  const avgOhmPerDay = ohmPriceNumber > 0 ? avgYieldPerDay / ohmPriceNumber : 0;

  const formatOhm = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(2)}K OHM`;
    }
    return `${value.toFixed(2)} OHM`;
  };

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: DailyRepurchase }>;
  }) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-surface-tooltip border border-a10 rounded-xl p-3 shadow-lg">
        <p className="text-xs text-secondary-t mb-1">
          {format(new Date(data.date), "MMM dd, yyyy, h:mm a")}
        </p>
        <p className="text-sm font-medium">{formatOhm(data.ohmAmount)}</p>
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
            <h3 className="text-base font-medium text-secondary-t">OHM Repurchases</h3>
            <InfoTooltip title="Expected OHM that can be repurchased from protocol yield at current OHM price.">
              <RiInformationFill size={16} className="text-tertiary-t" />
            </InfoTooltip>
          </div>
          <div className="flex items-baseline gap-4">
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-secondary-t">Total OHM</span>
                <InfoTooltip title="Total OHM that can be repurchased from claimed and claimable yield at current OHM price.">
                  <RiInformationFill size={14} className="text-tertiary-t" />
                </InfoTooltip>
              </div>
              <p className="text-2xl font-semibold">{formatOhm(expectedTotalOhm)}</p>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-secondary-t">Avg. / Day</span>
                <InfoTooltip title="Average daily OHM repurchases calculated from claimed yields in the selected period.">
                  <RiInformationFill size={14} className="text-tertiary-t" />
                </InfoTooltip>
              </div>
              <p className="text-2xl font-semibold">{formatOhm(avgOhmPerDay)}</p>
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
          No repurchase data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <defs>
              <linearGradient id="ohmRepurchasesBarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.barGradientStart} stopOpacity={0.4} />
                <stop offset="100%" stopColor={CHART_COLORS.barGradientStart} stopOpacity={0.05} />
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
              tickFormatter={(value) => value.toFixed(0)}
              stroke={CHART_COLORS.text}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--surface-a5)" }} />
            <ReferenceLine
              y={avgOhmPerDay}
              stroke={CHART_COLORS.avgLine}
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />
            <Bar
              dataKey="ohmAmount"
              fill="url(#ohmRepurchasesBarGradient)"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};
