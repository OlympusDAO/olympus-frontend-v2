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
  Legend,
} from "recharts";
import { Card } from "@/components/ui/card.tsx";
import { useV1UtilizationData } from "@/lib/hooks/cooler/useV1UtilizationData.ts";
import { formatUSD, formatDateTick } from "@/lib/hooks/cooler/utils.ts";

const CHART_COLORS = {
  principal: "var(--blue)",
  interest: "var(--purple)",
  grid: "var(--border-a10)",
  text: "var(--text-secondary)",
} as const;

interface ChartDataPoint {
  date: string;
  totalPrincipalReceivables: number;
  totalInterestReceivables: number;
}

export const MetricsV1UtilizationChart: React.FC = () => {
  const { data: v1Data, isLoading } = useV1UtilizationData();

  const chartData = useMemo((): ChartDataPoint[] => {
    if (!v1Data || v1Data.length === 0) return [];
    return v1Data.map((dp) => ({
      date: dp.date,
      totalPrincipalReceivables: dp.totalPrincipalReceivables,
      totalInterestReceivables: dp.totalInterestReceivables,
    }));
  }, [v1Data]);

  const capacityRemaining = useMemo(() => {
    if (!v1Data || v1Data.length === 0) return 0;
    const last = v1Data[v1Data.length - 1];
    return (
      last.sReserveInReserveBalance +
      last.treasurySReserveInReserveBalance +
      last.reserveBalance +
      last.treasuryReserveBalance
    );
  }, [v1Data]);

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
    payload?: Array<{ payload: ChartDataPoint; dataKey: string; value: number; color: string }>;
  }) => {
    if (!active || !payload || payload.length === 0) return null;
    const data = payload[0].payload;
    return (
      <div className="bg-surface-tooltip border border-a10 rounded-xl p-3 shadow-lg">
        <p className="text-xs text-secondary-t mb-2">{data.date}</p>
        <p className="text-sm font-medium" style={{ color: CHART_COLORS.principal }}>
          Borrowed: {formatUSD(data.totalPrincipalReceivables)}
        </p>
        <p className="text-sm font-medium" style={{ color: CHART_COLORS.interest }}>
          Interest: {formatUSD(data.totalInterestReceivables)}
        </p>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="w-40 h-5 bg-surface-a5 rounded animate-pulse mb-4" />
        <div className="w-full h-[200px] bg-surface-a5 rounded-xl animate-pulse" />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-base font-medium text-secondary-t">V1 Utilization</h3>
          <span className="text-xs text-tertiary-t">
            Capacity remaining: {formatUSD(capacityRemaining)}
          </span>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="w-full h-[200px] flex items-center justify-center text-secondary-t">
          No V1 utilization data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <defs>
              <linearGradient id="principalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.principal} stopOpacity={0.25} />
                <stop offset="100%" stopColor={CHART_COLORS.principal} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="interestGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.interest} stopOpacity={0.25} />
                <stop offset="100%" stopColor={CHART_COLORS.interest} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateTick}
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
              dataKey="totalPrincipalReceivables"
              name="Amount Borrowed"
              stroke={CHART_COLORS.principal}
              fill="url(#principalGradient)"
              strokeWidth={2}
              activeDot={false}
            />
            <Area
              type="monotone"
              dataKey="totalInterestReceivables"
              name="Interest Due"
              stroke={CHART_COLORS.interest}
              fill="url(#interestGradient)"
              strokeWidth={2}
              activeDot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};
