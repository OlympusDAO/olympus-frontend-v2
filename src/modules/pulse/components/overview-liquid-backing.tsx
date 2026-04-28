import { Card } from "@/components/ui/card";
import { NumberFlow } from "@/components/ui/number-flow";
import { PriceChange } from "@/components/price-change";
import { useBackingHistory } from "@/lib/hooks/liveness/useBackingHistory";
import { SparklineChart } from "@/components/ui/sparkline-chart";
import { useTreasuryMetrics } from "@/modules/pulse/hooks/useTreasuryMetrics.ts";
import { getReferenceSnapshot } from "@/lib/utils";
import type { TimeWindow } from "@/modules/pulse/hooks/useRevenueCounter.ts";
import { Spinner } from "@/components/spinner";

const WINDOW_DAYS: Record<TimeWindow, number> = { daily: 7, weekly: 30, annualized: 365 };
const WINDOW_HOURS: Record<TimeWindow, number> = {
  daily: 24,
  weekly: 7 * 24,
  annualized: 365 * 24,
};
const WINDOW_LABEL: Record<TimeWindow, string> = { daily: "24h", weekly: "7d", annualized: "1y" };

export function OverviewLiquidBacking({ timeWindow }: { timeWindow: TimeWindow }) {
  const { data: history, isLoading } = useBackingHistory(WINDOW_DAYS[timeWindow]);
  const { data: treasuryMetrics } = useTreasuryMetrics();

  const dataPoints = history?.dataPoints ?? [];
  const liveBacking = treasuryMetrics?.treasuryLiquidBackingPerOhmBacked ?? 0;
  const refPoint = getReferenceSnapshot(dataPoints, WINDOW_HOURS[timeWindow]);
  const change =
    refPoint && liveBacking > 0
      ? ((liveBacking - refPoint.backing) / refPoint.backing) * 100
      : null;
  const isPositive = (change ?? 0) >= 0;

  const sparklineData =
    liveBacking > 0
      ? [
          ...dataPoints,
          {
            date: new Date().toISOString(),
            backing: liveBacking,
            ohmPrice: treasuryMetrics?.ohmPrice ?? 0,
          },
        ]
      : dataPoints;

  return (
    <Card className="flex items-center justify-between gap-4 p-5 max-xs:flex-col max-xs:items-start">
      <div className="min-w-0">
        <p className="mb-1 text-sm/5 font-semibold">Liquid Backing Per OHM</p>
        <div className="flex gap-x-2">
          <NumberFlow
            value={liveBacking}
            format={{ minimumFractionDigits: 2 }}
            className="text-xl/6 font-semibold tracking-tight"
          />
          {change !== null && (
            <PriceChange percentage={change} timeframe={WINDOW_LABEL[timeWindow]} />
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2">
          <Spinner className="size-8" />
          <p className="text-secondary-t text-sm">Loading chart data</p>
        </div>
      ) : (
        <SparklineChart
          data={sparklineData}
          dataKey="backing"
          isPositive={isPositive}
          valueLabel="Liquid Backing"
        />
      )}
    </Card>
  );
}
