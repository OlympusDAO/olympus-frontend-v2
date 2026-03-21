import { Card } from "@/components/ui/card";
import { NumberFlow } from "@/components/ui/number-flow";
import { PriceChange } from "@/components/price-change";
import { useBackingHistory } from "@/lib/hooks/liveness/useBackingHistory";
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts";

export function OverviewLiquidBacking() {
  const { data: history } = useBackingHistory(30);

  const dataPoints = history?.dataPoints ?? [];
  const currentBacking = history?.currentBacking ?? 0;

  const change24h =
    dataPoints.length >= 2
      ? ((dataPoints[dataPoints.length - 1].backing - dataPoints[dataPoints.length - 2].backing) /
          dataPoints[dataPoints.length - 2].backing) *
        100
      : 0;
  const isPositive = change24h >= 0;
  const gradientId = "backingSparkGrad";

  return (
    <Card className="flex items-center justify-between gap-4 p-5">
      <div className="min-w-0">
        <p className="mb-1 text-[15px]/[20px] font-semibold">Liquid Backing Per OHM</p>
        <div className="flex gap-x-2">
          <NumberFlow
            value={currentBacking}
            className="tabular-nums text-2xl font-bold tracking-tight"
          />
          {dataPoints.length >= 2 && <PriceChange percentage={change24h} timeframe="24h" />}
        </div>
      </div>

      {dataPoints.length > 1 && (
        <div className="w-55 shrink-0">
          <ResponsiveContainer width="100%" height={56}>
            <AreaChart data={dataPoints} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={isPositive ? "var(--green)" : "var(--red)"}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="100%"
                    stopColor={isPositive ? "var(--green)" : "var(--red)"}
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
              <YAxis domain={["dataMin", "dataMax"]} hide />
              <Area
                type="monotone"
                dataKey="backing"
                stroke={isPositive ? "var(--green)" : "var(--red)"}
                strokeWidth={1.5}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
