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
import { NumberFlow } from "@/components/ui/number-flow.tsx";
import { useV1UtilizationData } from "@/lib/hooks/cooler/useV1UtilizationData.ts";
import { useV2HistoricalData } from "@/lib/hooks/cooler/useV2Data.ts";
import { formatDateTick } from "@/lib/hooks/cooler/utils.ts";
import type { Format } from "@number-flow/react";

const CHART_COLORS = {
  v1: "var(--blue)",
  v2: "var(--green)",
  grid: "var(--border-a10)",
  text: "var(--text-secondary)",
} as const;

const USD_COMPACT: Format = {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
};

interface CombinedDataPoint {
  date: string;
  v1: number;
  v2: number;
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: CombinedDataPoint }>;
}) {
  if (!active || !payload?.[0]) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-surface-tooltip shadow-tooltip rounded-[20px] px-3 py-2 text-sm">
      <p className="text-secondary-t mb-2">{data.date}</p>
      <div className="flex flex-col gap-1">
        <div className="flex justify-between gap-4">
          <span className="font-medium" style={{ color: CHART_COLORS.v1 }}>
            V1
          </span>
          <NumberFlow value={data.v1} format={USD_COMPACT} />
        </div>
        <div className="flex justify-between gap-4">
          <span className="font-medium" style={{ color: CHART_COLORS.v2 }}>
            V2
          </span>
          <NumberFlow value={data.v2} format={USD_COMPACT} />
        </div>
        <div className="flex justify-between gap-4 border-t border-a10 pt-1 mt-1">
          <span className="font-medium">Total</span>
          <NumberFlow value={data.v1 + data.v2} format={USD_COMPACT} />
        </div>
      </div>
    </div>
  );
}

export const MetricsProtocolUtilizationChart: React.FC = () => {
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

      return {
        date,
        v1: lastV1,
        v2: lastV2,
      };
    });
  }, [v1UtilData, v2Data]);

  const currentTotal =
    chartData.length > 0
      ? chartData[chartData.length - 1].v1 + chartData[chartData.length - 1].v2
      : 0;

  if (isLoading) {
    return (
      <Card className="px-6 py-5">
        <div className="flex justify-between items-start mb-4">
          <div className="w-40 h-5 bg-surface-a5 rounded animate-pulse" />
          <div className="w-32 h-5 bg-surface-a5 rounded animate-pulse" />
        </div>
        <div className="w-full h-[200px] bg-surface-a5 rounded-xl animate-pulse" />
      </Card>
    );
  }

  return (
    <Card className="px-6 py-5">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-medium text-secondary-t">Protocol Utilization</h3>
          <NumberFlow
            className="text-xl/[24px] font-semibold tracking-[0.2px]"
            value={currentTotal}
            format={{ notation: "standard" }}
          />
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
            <Tooltip content={CustomTooltip} />
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
