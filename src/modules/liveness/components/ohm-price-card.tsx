import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTreasuryMetrics } from "@/modules/pulse/hooks/useTreasuryMetrics.ts";
import { useOhmPriceHistory } from "@/modules/pulse/hooks/useOhmPriceHistory.ts";
import { formatUsd } from "@/lib/liveness/formatters";
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts";

export function OhmPriceCard() {
  const { data: treasury, isLoading: metricsLoading } = useTreasuryMetrics();
  const { data: history, isLoading: historyLoading } = useOhmPriceHistory();

  if (metricsLoading || !treasury) {
    return (
      <Card className="flex flex-col justify-between p-8">
        <div>
          <Skeleton className="mb-4 h-4 w-24" />
          <Skeleton className="mb-2 h-10 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="mt-4 h-20 w-full" />
      </Card>
    );
  }

  const currentPrice = treasury.ohmPrice;
  const change24h = history?.change24h ?? 0;
  const dataPoints = history?.dataPoints ?? [];
  const isPositive = change24h >= 0;
  const gradientId = "ohmSparklineGrad";

  return (
    <Card className="flex flex-col justify-between p-8">
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-widest text-secondary-t">
          OHM Price
        </p>

        <p className="mb-1 text-4xl font-bold tabular-nums tracking-tight">
          {formatUsd(currentPrice)}
        </p>

        {history ? (
          <p
            className="flex items-center gap-1 text-sm font-medium tabular-nums"
            style={{ color: isPositive ? "var(--green)" : "var(--red)" }}
          >
            <span>{isPositive ? "\u25B2" : "\u25BC"}</span>
            <span>
              {isPositive ? "+" : ""}
              {change24h.toFixed(2)}% (24h)
            </span>
          </p>
        ) : (
          <Skeleton className="h-4 w-28" />
        )}
      </div>

      {historyLoading || !history ? (
        <Skeleton className="mt-4 h-20 w-full" />
      ) : dataPoints.length > 1 ? (
        <div className="mt-4">
          <ResponsiveContainer width="100%" height={80}>
            <AreaChart data={dataPoints} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
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
                dataKey="price"
                stroke={isPositive ? "var(--green)" : "var(--red)"}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </Card>
  );
}
