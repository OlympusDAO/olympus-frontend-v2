import type React from "react";
import { useMemo, useState } from "react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Scatter,
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHistoricalPriceData } from "@/lib/hooks/cds/useHistoricalPriceData";
import { useAuctionParameters } from "@/lib/hooks/cds/useAuctionParameters";
import {
  processHistoricalData,
  toChartData,
  type ChartDataPoint,
} from "@/lib/utils/priceChartUtils";

// Theme colors from variables.css
const CHART_COLORS = {
  tickPrice: "var(--blue)",
  decayPrice: "var(--purple)",
  bidPrice: "var(--green)",
  minPrice: "var(--red)",
  grid: "var(--border-a10)",
  text: "var(--text-secondary)",
} as const;

interface PriceChartProps {
  depositPeriod: number;
  className?: string;
}

interface PriceChartMiniProps {
  depositPeriod: number;
  currentPrice?: number;
  className?: string;
}

type TimeRange = "1d" | "7d" | "30d" | "all";
type MiniTimeRange = "1d" | "7d" | "30d";

export const PriceChart: React.FC<PriceChartProps> = ({ depositPeriod, className = "" }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  const { tickStep } = useAuctionParameters();

  // Fetch historical data from GraphQL
  const { data: historicalData, isLoading } = useHistoricalPriceData(depositPeriod, timeRange);

  // Process historical data into chart format
  const chartData = useMemo((): ChartDataPoint[] => {
    if (!historicalData) return [];

    const tickData = processHistoricalData(
      historicalData.depositPeriodSnapshots,
      historicalData.bids,
      historicalData.snapshots,
      tickStep ?? 10000,
    );

    return toChartData(tickData);
  }, [historicalData, tickStep]);

  // Calculate Y-axis domain (excluding zero values)
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return ["auto", "auto"] as const;

    const prices = chartData
      .flatMap((d) => [d.tickPrice, d.minPrice, d.bidPrice])
      .filter((p): p is number => p !== undefined && p !== null && p > 0);

    if (prices.length === 0) return ["auto", "auto"] as const;

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.1;

    return [Math.max(0, min - padding), max + padding] as const;
  }, [chartData]);

  // Custom tooltip
  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{
      name: string;
      value: number;
      color: string;
      dataKey: string;
      payload: ChartDataPoint;
    }>;
  }) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;
    const date = new Date(data.timestamp);

    return (
      <div className="bg-surface-tooltip border border-a10 rounded-xl p-3 shadow-lg min-w-[180px]">
        <p className="text-xs text-secondary-t mb-2">{format(date, "MMM dd, yyyy HH:mm")}</p>

        {data.tickPrice !== undefined && (
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-secondary-t">Tick Price:</span>{" "}
              <span className="font-medium text-blue">{data.tickPrice.toFixed(4)}</span>
            </p>
            {data.minPrice !== undefined && (
              <p className="text-sm">
                <span className="text-secondary-t">Min Price:</span>{" "}
                <span className="font-medium text-red">{data.minPrice.toFixed(4)}</span>
              </p>
            )}
            {data.bidPrice !== undefined && (
              <p className="text-sm">
                <span className="text-secondary-t">Bid Price:</span>{" "}
                <span className="font-medium text-green">{data.bidPrice.toFixed(4)}</span>
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={className}>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-semibold">Price History</h2>
          <div className="w-48 h-9 bg-surface-a3 rounded-lg animate-pulse" />
        </div>
        <Card className="p-6">
          <div className="w-full h-[300px] bg-surface-a3 rounded-xl animate-pulse" />
        </Card>
      </div>
    );
  }

  const hasData = chartData.length > 0;

  return (
    <div className={className}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
        <h2 className="text-xl font-semibold">Price History</h2>
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
          <TabsList>
            <TabsTrigger value="1d">1D</TabsTrigger>
            <TabsTrigger value="7d">7D</TabsTrigger>
            <TabsTrigger value="30d">30D</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <Card className="p-6">
        {!hasData ? (
          <div className="w-full h-[300px] flex items-center justify-center text-secondary-t">
            No price data available for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />

              <XAxis
                dataKey="timestamp"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(ts) => {
                  const date = new Date(ts);
                  if (timeRange === "1d") {
                    return format(date, "HH:mm");
                  }
                  return format(date, "MMM dd");
                }}
                stroke={CHART_COLORS.text}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />

              <YAxis
                domain={yDomain}
                tickFormatter={(value) => value.toFixed(2)}
                stroke={CHART_COLORS.text}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={50}
              />

              <Tooltip content={<CustomTooltip />} />

              {/* Historical tick price - primary line */}
              <Line
                type="stepAfter"
                dataKey="tickPrice"
                stroke={CHART_COLORS.tickPrice}
                name="Tick Price"
                dot={false}
                connectNulls
                strokeWidth={2}
                isAnimationActive={false}
              />

              {/* Min price line */}
              <Line
                type="stepAfter"
                dataKey="minPrice"
                stroke={CHART_COLORS.minPrice}
                strokeOpacity={0.7}
                name="Min Price"
                dot={false}
                connectNulls
                strokeWidth={1.5}
                isAnimationActive={false}
              />

              {/* Bid scatter points */}
              <Scatter
                dataKey="bidPrice"
                fill={CHART_COLORS.bidPrice}
                name="Bids"
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
};

/**
 * Compact version of the price chart for embedding in Position Info sidebar.
 */
export const PriceChartMini: React.FC<PriceChartMiniProps> = ({
  depositPeriod,
  currentPrice,
  className = "",
}) => {
  const [timeRange, setTimeRange] = useState<MiniTimeRange>("30d");

  const { tickStep } = useAuctionParameters();

  // Fetch historical data from GraphQL
  const { data: historicalData, isLoading } = useHistoricalPriceData(depositPeriod, timeRange);

  // Process historical data into chart format
  const chartData = useMemo((): ChartDataPoint[] => {
    if (!historicalData || !tickStep) return [];

    const tickData = processHistoricalData(
      historicalData.depositPeriodSnapshots,
      historicalData.bids,
      historicalData.snapshots,
      tickStep,
    );

    return toChartData(tickData);
  }, [historicalData, tickStep]);

  // Calculate Y-axis domain (excluding zero values)
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return ["auto", "auto"] as const;

    const prices = chartData
      .flatMap((d) => [d.tickPrice, d.decayPrice, d.minPrice, d.bidPrice])
      .filter((p): p is number => p !== undefined && p !== null && p > 0);

    // Include current price in domain calculation if provided
    if (currentPrice && currentPrice > 0) {
      prices.push(currentPrice);
    }

    if (prices.length === 0) return ["auto", "auto"] as const;

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.15;

    return [Math.max(0, min - padding), max + padding] as const;
  }, [chartData, currentPrice]);

  // Mini tooltip - includes full info
  const MiniTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{
      payload: ChartDataPoint;
    }>;
  }) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;
    const date = new Date(data.timestamp);

    return (
      <div className="bg-surface-tooltip border border-a10 rounded-lg p-2 shadow-lg text-xs min-w-[140px]">
        <p className="text-secondary-t mb-1.5">{format(date, "MMM dd, HH:mm")}</p>
        {data.tickPrice !== undefined && (
          <div className="space-y-0.5">
            <p>
              <span className="text-secondary-t">Tick Price:</span>{" "}
              <span className="font-medium text-blue">{data.tickPrice.toFixed(4)}</span>
            </p>
            {data.decayPrice !== undefined && (
              <p>
                <span className="text-secondary-t">Decay To:</span>{" "}
                <span className="font-medium text-purple">{data.decayPrice.toFixed(4)}</span>
              </p>
            )}
            {data.bidPrice !== undefined && (
              <p>
                <span className="text-secondary-t">Bid Price:</span>{" "}
                <span className="font-medium text-green">{data.bidPrice.toFixed(4)}</span>
              </p>
            )}
            {data.minPrice !== undefined && (
              <p>
                <span className="text-secondary-t">Min Price:</span>{" "}
                <span className="font-medium text-red">{data.minPrice.toFixed(4)}</span>
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Conversion Price History</span>
          <div className="w-20 h-6 bg-surface-a5 rounded animate-pulse" />
        </div>
        <div className="w-full h-[160px] bg-surface-a5 rounded-lg animate-pulse" />
      </div>
    );
  }

  const hasData = chartData.length > 0;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Conversion Price History</span>
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as MiniTimeRange)}>
          <TabsList className="h-6 p-0.5 gap-0">
            <TabsTrigger value="1d" className="h-5 px-2 text-xs rounded-sm">
              1D
            </TabsTrigger>
            <TabsTrigger value="7d" className="h-5 px-2 text-xs rounded-sm">
              7D
            </TabsTrigger>
            <TabsTrigger value="30d" className="h-5 px-2 text-xs rounded-sm">
              1M
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {!hasData ? (
        <div className="w-full h-[160px] flex items-center justify-center text-secondary-t text-xs">
          No data available
        </div>
      ) : (
        <div className="relative">
          <ResponsiveContainer width="100%" height={160}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={CHART_COLORS.grid}
                vertical={false}
                horizontal={true}
              />

              <XAxis
                dataKey="timestamp"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(ts) => format(new Date(ts), "MM/dd")}
                stroke={CHART_COLORS.text}
                fontSize={9}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--text-secondary)" }}
              />

              <YAxis
                domain={yDomain}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
                stroke={CHART_COLORS.text}
                fontSize={9}
                tickLine={false}
                axisLine={false}
                width={30}
                tick={{ fill: "var(--text-secondary)" }}
              />

              <Tooltip content={<MiniTooltip />} />

              {/* Price range fill */}
              <Area
                type="stepAfter"
                dataKey="priceRange"
                stroke="none"
                fill={CHART_COLORS.tickPrice}
                fillOpacity={0.1}
                connectNulls
                isAnimationActive={false}
              />

              {/* Tick price line - dashed green like the reference */}
              <Line
                type="stepAfter"
                dataKey="tickPrice"
                stroke={CHART_COLORS.bidPrice}
                strokeDasharray="4 2"
                name="Tick Price"
                dot={false}
                connectNulls
                strokeWidth={1.5}
                isAnimationActive={false}
              />

              {/* Min price line */}
              <Line
                type="stepAfter"
                dataKey="minPrice"
                stroke={CHART_COLORS.minPrice}
                strokeOpacity={0.5}
                name="Min Price"
                dot={false}
                connectNulls
                strokeWidth={1}
                isAnimationActive={false}
              />

              {/* Current price reference line */}
              {currentPrice && currentPrice > 0 && (
                <ReferenceLine
                  y={currentPrice}
                  stroke={CHART_COLORS.tickPrice}
                  strokeWidth={1.5}
                  label={{
                    value: "Your Price",
                    position: "right",
                    fill: CHART_COLORS.text,
                    fontSize: 9,
                  }}
                />
              )}

              {/* Bid scatter points */}
              <Scatter
                dataKey="bidPrice"
                fill={CHART_COLORS.bidPrice}
                name="Bids"
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
