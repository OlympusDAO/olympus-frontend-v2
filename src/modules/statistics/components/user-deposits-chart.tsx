import type React from "react";
import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, startOfDay, eachDayOfInterval, subDays } from "date-fns";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip as InfoTooltip } from "@/components/ui/tooltip";
import { RiInformationFill } from "@remixicon/react";
import {
  useStatisticsData,
  useAllTimeDeposits,
  type TimeRange,
} from "@/lib/hooks/cds/useStatisticsData";

const CHART_COLORS = {
  barGradientStart: "var(--green)",
  barGradientEnd: "oklch(69.043% 0.12334 156.209 / 0.3)", // green with transparency
  grid: "var(--border-a10)",
  text: "var(--text-secondary)",
} as const;

interface DailyDeposit {
  date: number;
  dateLabel: string;
  amount: number;
}

export const UserDepositsChart: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  const { data: statisticsData, isLoading } = useStatisticsData(timeRange);
  const { data: allTimeDeposits, isLoading: isLoadingTotal } = useAllTimeDeposits();

  // Process bids into daily deposits, filling in all days in the range
  const chartData = useMemo((): DailyDeposit[] => {
    const timeRangeDays: Record<TimeRange, number> = {
      "7d": 7,
      "30d": 30,
      "1y": 365,
    };
    const days = timeRangeDays[timeRange];
    const today = startOfDay(new Date());
    const cdsLaunchDate = new Date("2025-12-01");
    // Start from the later of: (today - days) or CDS launch date
    const calculatedStartDate = subDays(today, days - 1);
    const startDate = calculatedStartDate > cdsLaunchDate ? calculatedStartDate : cdsLaunchDate;

    // Generate all days in the range
    const allDays = eachDayOfInterval({ start: startDate, end: today });

    // Group bids by day
    const dailyMap = new Map<number, number>();
    allDays.forEach((day) => {
      dailyMap.set(day.getTime(), 0);
    });

    // Add bid amounts to their respective days
    if (statisticsData?.bids) {
      statisticsData.bids.forEach((bid) => {
        const dayStart = startOfDay(new Date(bid.timestamp * 1000)).getTime();
        if (dailyMap.has(dayStart)) {
          const currentAmount = dailyMap.get(dayStart) || 0;
          dailyMap.set(dayStart, currentAmount + parseFloat(bid.depositAmountDecimal));
        }
      });
    }

    // Convert to array and sort by date
    return Array.from(dailyMap.entries())
      .map(([date, amount]) => ({
        date,
        dateLabel: format(new Date(date), "MMM dd"),
        amount,
      }))
      .sort((a, b) => a.date - b.date);
  }, [statisticsData, timeRange]);

  // Calculate totals
  // Total = all-time deposits (sum of all bids ever)
  const totalDeposits = allTimeDeposits ?? 0;

  // Period deposits = sum of new deposits in the selected time period
  const periodDeposits = useMemo(() => {
    if (!statisticsData?.bids) return 0;
    return statisticsData.bids.reduce((acc, bid) => acc + parseFloat(bid.depositAmountDecimal), 0);
  }, [statisticsData]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: DailyDeposit }>;
  }) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-surface-tooltip border border-a10 rounded-xl p-3 shadow-lg">
        <p className="text-xs text-secondary-t mb-1">
          {format(new Date(data.date), "MMM dd, yyyy")}
        </p>
        <p className="text-sm font-medium">Depositor USD: {formatCurrency(data.amount)}</p>
      </div>
    );
  };

  if (isLoading || isLoadingTotal) {
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

  const periodLabel = timeRange === "7d" ? "7d" : timeRange === "30d" ? "1M" : "1Y";

  return (
    <Card className="p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <h3 className="text-base font-medium text-secondary-t">User Deposits</h3>
            <InfoTooltip title="USD value deposited by users into the Convertible Deposit System.">
              <RiInformationFill size={16} className="text-tertiary-t" />
            </InfoTooltip>
          </div>
          <div className="flex items-baseline gap-4">
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-secondary-t">Total</span>
                <InfoTooltip title="All-time total deposits from users since launch.">
                  <RiInformationFill size={14} className="text-tertiary-t" />
                </InfoTooltip>
              </div>
              <p className="text-2xl font-semibold">{formatCurrency(totalDeposits)}</p>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-secondary-t">{periodLabel}</span>
                <InfoTooltip title="New deposits made during the selected time period.">
                  <RiInformationFill size={14} className="text-tertiary-t" />
                </InfoTooltip>
              </div>
              <p className="text-2xl font-semibold">{formatCurrency(periodDeposits)}</p>
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
          No deposit data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <defs>
              <linearGradient id="depositsBarGradient" x1="0" y1="0" x2="0" y2="1">
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
              tickFormatter={(value) => formatCurrency(value)}
              stroke={CHART_COLORS.text}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--surface-a5)" }} />
            <Bar
              dataKey="amount"
              fill="url(#depositsBarGradient)"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};
