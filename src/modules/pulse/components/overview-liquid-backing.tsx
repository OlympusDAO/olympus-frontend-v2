import { Card } from "@/components/ui/card";
import { NumberFlow } from "@/components/ui/number-flow";
import { PriceChange } from "@/components/price-change";
import { useBackingHistory } from "@/lib/hooks/liveness/useBackingHistory";
import { SparklineChart } from "@/components/ui/sparkline-chart";
import { useTreasuryMetrics } from "@/modules/pulse/hooks/useTreasuryMetrics.ts";
import { getReferenceSnapshot } from "@/lib/utils";

export function OverviewLiquidBacking() {
  const { data: history } = useBackingHistory(30);
  const { data: treasuryMetrics } = useTreasuryMetrics();

  const dataPoints = history?.dataPoints ?? [];
  const liveBacking = treasuryMetrics?.treasuryLiquidBackingPerOhmBacked ?? 0;
  const ref24h = getReferenceSnapshot(dataPoints, 24);
  const change24h =
    ref24h && liveBacking > 0 ? ((liveBacking - ref24h.backing) / ref24h.backing) * 100 : null;
  const isPositive = (change24h ?? 0) >= 0;

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
          {change24h !== null && <PriceChange percentage={change24h} timeframe="24h" />}
        </div>
      </div>

      <SparklineChart
        data={sparklineData}
        dataKey="backing"
        isPositive={isPositive}
        valueLabel="Liquid Backing"
      />
    </Card>
  );
}
