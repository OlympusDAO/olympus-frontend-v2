import { Card } from "@/components/ui/card";
import { useOhmPriceHistory } from "@/modules/pulse/hooks/useOhmPriceHistory.ts";
import { SparklineChart } from "@/components/ui/sparkline-chart.tsx";
import { NumberFlow } from "@/components/ui/number-flow.tsx";
import { PriceChange } from "@/components/price-change.tsx";
import { useToken } from "@/lib/hooks/useToken.tsx";
import { TokenName } from "@/lib/tokens.ts";
import { getReferenceSnapshot } from "@/lib/utils.ts";
import type { TimeWindow } from "@/modules/pulse/hooks/useRevenueCounter.ts";
import { Spinner } from "@/components/spinner";

const WINDOW_DAYS: Record<TimeWindow, number> = { daily: 7, weekly: 30, annualized: 365 };
const WINDOW_HOURS: Record<TimeWindow, number> = {
  daily: 24,
  weekly: 7 * 24,
  annualized: 365 * 24,
};
const WINDOW_LABEL: Record<TimeWindow, string> = { daily: "24h", weekly: "7d", annualized: "1y" };

export function OverviewOhmPrice({ timeWindow }: { timeWindow: TimeWindow }) {
  const { data: history, isLoading } = useOhmPriceHistory(WINDOW_DAYS[timeWindow]);
  const OHMToken = useToken(TokenName.OHM);

  const dataPoints = history?.dataPoints ?? [];
  const livePrice = OHMToken.price;
  const refPoint = getReferenceSnapshot(dataPoints, WINDOW_HOURS[timeWindow]);
  const change =
    refPoint && livePrice > 0 ? ((livePrice - refPoint.price) / refPoint.price) * 100 : null;
  const isPositive = (change ?? 0) >= 0;

  const sparklineData =
    livePrice > 0
      ? [...dataPoints, { date: new Date().toISOString(), price: livePrice }]
      : dataPoints;

  return (
    <Card className="flex items-center justify-between gap-4 p-5 max-xs:flex-col max-xs:items-start">
      <div className="min-w-0">
        <p className="mb-1 text-sm/5 font-semibold">OHM Price</p>
        <div className="flex gap-x-2">
          <NumberFlow
            value={livePrice}
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
          dataKey="price"
          isPositive={isPositive}
          valueLabel="OHM Price"
        />
      )}
    </Card>
  );
}
