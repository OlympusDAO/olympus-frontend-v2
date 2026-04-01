import { Card } from "@/components/ui/card";
import { useTreasuryMetrics } from "@/modules/pulse/hooks/useTreasuryMetrics.ts";
import { useOhmPriceHistory } from "@/modules/pulse/hooks/useOhmPriceHistory.ts";
import { SparklineChart } from "@/components/ui/sparkline-chart.tsx";
import { NumberFlow } from "@/components/ui/number-flow.tsx";
import { PriceChange } from "@/components/price-change.tsx";

export function OverviewOhmPrice() {
  const { data: treasury } = useTreasuryMetrics();
  const { data: history } = useOhmPriceHistory();

  const currentPrice = treasury?.ohmPrice ?? 0;
  const change24h = history?.change24h ?? 0;
  const dataPoints = history?.dataPoints ?? [];
  const isPositive = change24h >= 0;

  return (
    <Card className="flex items-center justify-between gap-4 p-5">
      <div className="min-w-0">
        <p className="mb-1 text-[15px]/[20px] font-semibold">OHM Price</p>
        <div className="flex gap-x-2">
          <NumberFlow
            value={currentPrice}
            className="tabular-nums text-2xl font-bold tracking-tight"
          />
          {history && <PriceChange percentage={change24h} timeframe="24h" />}
        </div>
      </div>

      <SparklineChart data={dataPoints} dataKey="price" isPositive={isPositive} />
    </Card>
  );
}
