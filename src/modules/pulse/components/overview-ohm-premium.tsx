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

export function OverviewOhmPremium() {
  const { data: treasury } = useTreasuryMetrics();
  const { data: history } = useBackingHistory(30);
  const OHMToken = useToken(TokenName.OHM);

  const ohmPrice = OHMToken.price;
  const backing = treasury?.treasuryLiquidBackingPerOhmBacked ?? 0;
  const livePremium = ohmPrice - backing;

  const dataPoints = history?.dataPoints ?? [];
  const premiumDataPoints = dataPoints.map((p) => ({
    ...p,
    premium: p.ohmPrice - p.backing,
  }));

  const ref24h = getReferenceSnapshot(premiumDataPoints, 24);
  const change24h =
    ref24h && ref24h.premium > 0 && livePremium > 0
      ? ((livePremium - ref24h.premium) / ref24h.premium) * 100
      : null;
  const isPositive = (change24h ?? 0) >= 0;

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
          {change24h !== null && <PriceChange percentage={change24h} timeframe="24h" />}
        </div>
      </div>

      <SparklineChart
        data={sparklineData}
        dataKey="premium"
        isPositive={isPositive}
        valueLabel="OHM Premium"
      />
    </Card>
  );
}
