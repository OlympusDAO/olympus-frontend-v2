import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card } from "@/components/ui/card";
import { useV1UtilizationData } from "@/lib/hooks/cooler/useV1UtilizationData";
import { useV2HistoricalData } from "@/lib/hooks/cooler/useV2Data";
import { formatUSD } from "@/lib/hooks/cooler/utils";

const CHART_COLORS = {
  v1: "var(--blue)",
  v2: "var(--green)",
  grid: "var(--border-a10)",
  text: "var(--text-secondary)",
} as const;

interface CombinedDataPoint {
  date: string;
  dateLabel: string;
  v1: number;
  v2: number;
}

export const ProtocolUtilizationChart: React.FC = () => {
  const { data: v1UtilData, isLoading: v1Loading } = useV1UtilizationData();
  const { data: v2Data, isLoading: v2Loading } = useV2HistoricalData(120);

  const isLoading = v1Loading || v2Loading;

  const chartData = useMemo((): CombinedDataPoint[] => {
    const v1ValuesByDate = new Map<string, number>();
    if (v1UtilData) {
      v1UtilData.forEach((dp: { date: string; totalPrincipalReceivables: number }) => {
        v1ValuesByDate.set(dp.date, dp.totalPrincipalReceivables);
      });
    }

    const v2ValuesByDate = new Map<string, number>();
    if (v2Data) {
      v2Data.forEach((dp) => {
        const date = new Date(dp.timestamp / 1000).toISOString().split("T")[0];
        v2ValuesByDate.set(date, dp.totalDebt);
      });
    }

    const allDates = new Set([...v1ValuesByDate.keys(), ...v2ValuesByDate.keys()]);
    const sortedDates = Array.from(allDates).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    );

    let lastV1 = 0;
    let lastV2 = 0;

    return sortedDates.map((date) => {
      if (v1ValuesByDate.has(date)) lastV1 = v1ValuesByDate.get(date)!;
      if (v2ValuesByDate.has(date)) lastV2 = v2ValuesByDate.get(date)!;

      const parts = date.split("-");
      return {
        date,
        dateLabel: `${parts[1]}/${parts[2]}`,
        v1: lastV1,
        v2: lastV2,
      };
    });
  }, [v1UtilData, v2Data]);

  const currentTotal = chartData.length > 0
    ? chartData[chartData.length - 1].v1 + chartData[chartData.length - 1].v2
    : 0;

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: CombinedDataPoint; dataKey: string; value: number; color: string }>;
  }) => {
    if (!active || !payload || payload.length === 0) return null;
    const data = payload[0].payload;
    return (
      <div className="bg-surface-tooltip border border-a10 rounded-xl p-3 shadow-lg">
        <p className="text-xs text-secondary-t mb-2">{data.date}</p>
        <p className="text-sm font-medium" style={{ color: CHART_COLORS.v1 }}>
          V1: {formatUSD(data.v1)}
        </p>
        <p className="text-sm font-medium" style={{ color: CHART_COLORS.v2 }}>
          V2: {formatUSD(data.v2)}
        </p>
        <p className="text-sm font-medium mt-1 border-t border-a10 pt-1">
          Total: {formatUSD(data.v1 + data.v2)}
        </p>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="w-40 h-5 bg-surface-a5 rounded animate-pulse" />
          <div className="w-32 h-5 bg-surface-a5 rounded animate-pulse" />
        </div>
        <div className="w-full h-[200px] bg-surface-a5 rounded-xl animate-pulse" />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-base font-medium text-secondary-t">Protocol Utilization</h3>
          <p className="text-2xl font-semibold mt-1">
            {formatUSD(currentTotal)}
          </p>
          <span className="text-xs text-tertiary-t">Total borrowed</span>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="w-full h-[200px] flex items-center justify-center text-secondary-t">
          No utilization data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <defs>
              <linearGradient id="v1Gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.v1} stopOpacity={0.25} />
                <stop offset="100%" stopColor={CHART_COLORS.v1} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="v2Gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.v2} stopOpacity={0.25} />
                <stop offset="100%" stopColor={CHART_COLORS.v2} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={CHART_COLORS.grid}
              vertical={false}
            />
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
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              height={24}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11 }}
            />
            <Area
              type="monotone"
              dataKey="v1"
              name="Cooler V1"
              stroke={CHART_COLORS.v1}
              fill="url(#v1Gradient)"
              strokeWidth={2}
              activeDot={false}
            />
            <Area
              type="monotone"
              dataKey="v2"
              name="Cooler V2"
              stroke={CHART_COLORS.v2}
              fill="url(#v2Gradient)"
              strokeWidth={2}
              activeDot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};
