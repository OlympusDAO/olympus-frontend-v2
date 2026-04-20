import { Card } from "@/components/ui/card";
import { NumberFlow } from "@/components/ui/number-flow";
import { PriceChange } from "@/components/price-change";
import { useBackingHistory } from "@/lib/hooks/liveness/useBackingHistory";
import { SparklineChart } from "@/components/ui/sparkline-chart";

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

  return (
    <Card className="flex items-center justify-between gap-4 p-5 max-xs:flex-col max-xs:items-start">
      <div className="min-w-0">
        <p className="mb-1 text-sm/5 font-semibold">Liquid Backing Per OHM</p>
        <div className="flex gap-x-2">
          <NumberFlow
            value={currentBacking}
            className="tabular-nums text-xl/6 font-semibold tracking-tight"
          />
          {dataPoints.length >= 2 && <PriceChange percentage={change24h} timeframe="24h" />}
        </div>
      </div>

      <SparklineChart data={dataPoints} dataKey="backing" isPositive={isPositive} />
    </Card>
  );
}
