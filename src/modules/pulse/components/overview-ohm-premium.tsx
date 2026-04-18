import { Card } from "@/components/ui/card";
import { NumberFlow } from "@/components/ui/number-flow";
import { PriceChange } from "@/components/price-change";
import { TooltipInfo } from "@/components/ui/tooltip";
import { useBackingHistory } from "@/lib/hooks/liveness/useBackingHistory";
import { useTreasuryMetrics } from "@/modules/pulse/hooks/useTreasuryMetrics.ts";
import { SparklineChart } from "@/components/ui/sparkline-chart";

export function OverviewOhmPremium() {
  const { data: treasury } = useTreasuryMetrics();
  const { data: history } = useBackingHistory(30);

  const ohmPrice = treasury?.ohmPrice ?? 0;
  const backing = treasury?.treasuryLiquidBackingPerOhmBacked ?? 0;
  const premium = ohmPrice - backing;

  const dataPoints = history?.dataPoints ?? [];
  const premiumDataPoints = dataPoints.map((p) => ({
    ...p,
    premium: ohmPrice - p.backing,
  }));

  const change24h =
    dataPoints.length >= 2
      ? ((dataPoints[dataPoints.length - 1].backing - dataPoints[dataPoints.length - 2].backing) /
          dataPoints[dataPoints.length - 2].backing) *
        100
      : 0;
  const isPositive = change24h >= 0;

  return (
    <Card className="flex items-center justify-between gap-4 p-5 max-xs:flex-col max-xs:items-start">
      <div className="min-w-0">
        <TooltipInfo title="OHM Premium = OHM Price − Liquid Backing Per OHM. Represents how much the market values OHM above its backing.">
          <p className="text-sm/5 font-semibold text-primary-t">OHM Premium</p>
        </TooltipInfo>
        <div className="flex gap-x-2 mt-1">
          <NumberFlow
            value={premium > 0 ? premium : 0}
            className="tabular-nums text-xl/6 font-semibold tracking-tight"
          />
          {dataPoints.length >= 2 && <PriceChange percentage={change24h} timeframe="24h" />}
        </div>
      </div>

      <SparklineChart data={premiumDataPoints} dataKey="premium" isPositive={isPositive} />
    </Card>
  );
}
