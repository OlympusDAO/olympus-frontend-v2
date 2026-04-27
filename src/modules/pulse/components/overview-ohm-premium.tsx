import { Card } from "@/components/ui/card";
import { NumberFlow } from "@/components/ui/number-flow";
import { PriceChange } from "@/components/price-change";
import { TooltipInfo } from "@/components/ui/tooltip";
import { useBackingHistory } from "@/lib/hooks/liveness/useBackingHistory";
import { useTreasuryMetrics } from "@/modules/pulse/hooks/useTreasuryMetrics.ts";
import { SparklineChart } from "@/components/ui/sparkline-chart";
import { getReferenceSnapshot } from "@/lib/utils";
import { useToken } from "@/lib/hooks/useToken.tsx";
import { TokenName } from "@/lib/tokens.ts";
import type { TimeWindow } from "@/modules/pulse/hooks/useRevenueCounter.ts";
import { Spinner } from "@/components/spinner";

const WINDOW_DAYS: Record<TimeWindow, number> = { daily: 7, weekly: 30, annualized: 365 };
const WINDOW_HOURS: Record<TimeWindow, number> = {
  daily: 24,
  weekly: 7 * 24,
  annualized: 365 * 24,
};
const WINDOW_LABEL: Record<TimeWindow, string> = { daily: "24h", weekly: "7d", annualized: "1y" };

export function OverviewOhmPremium({ timeWindow }: { timeWindow: TimeWindow }) {
  const { data: treasury } = useTreasuryMetrics();
  const { data: history, isLoading } = useBackingHistory(WINDOW_DAYS[timeWindow]);
  const OHMToken = useToken(TokenName.OHM);

  const ohmPrice = OHMToken.price;
  const backing = treasury?.treasuryLiquidBackingPerOhmBacked ?? 0;
  const livePremium = ohmPrice - backing;

  const dataPoints = history?.dataPoints ?? [];
  const premiumDataPoints = dataPoints.map((p) => ({
    ...p,
    premium: p.ohmPrice - p.backing,
  }));

  const refPoint = getReferenceSnapshot(premiumDataPoints, WINDOW_HOURS[timeWindow]);
  const change =
    refPoint && refPoint.premium > 0 && livePremium > 0
      ? ((livePremium - refPoint.premium) / refPoint.premium) * 100
      : null;
  const isPositive = (change ?? 0) >= 0;

  const sparklineData =
    livePremium > 0
      ? [
          ...premiumDataPoints,
          {
            date: new Date().toISOString(),
            backing,
            ohmPrice,
            premium: livePremium,
          },
        ]
      : premiumDataPoints;

  return (
    <Card className="flex items-center justify-between gap-4 p-5 max-xs:flex-col max-xs:items-start">
      <div className="min-w-0">
        <TooltipInfo title="OHM Premium = OHM Price − Liquid Backing Per OHM. Represents how much the market values OHM above its backing.">
          <p className="text-sm/5 font-semibold text-primary-t">OHM Premium</p>
        </TooltipInfo>
        <div className="flex gap-x-2 mt-1">
          <NumberFlow
            value={livePremium > 0 ? livePremium : 0}
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
          dataKey="premium"
          isPositive={isPositive}
          valueLabel="OHM Premium"
        />
      )}
    </Card>
  );
}
