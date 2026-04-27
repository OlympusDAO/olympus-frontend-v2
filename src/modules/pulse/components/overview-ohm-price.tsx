import { Card } from "@/components/ui/card";
import { useOhmPriceHistory } from "@/modules/pulse/hooks/useOhmPriceHistory.ts";
import { SparklineChart } from "@/components/ui/sparkline-chart.tsx";
import { NumberFlow } from "@/components/ui/number-flow.tsx";
import { PriceChange } from "@/components/price-change.tsx";
import { useToken } from "@/lib/hooks/useToken.tsx";
import { TokenName } from "@/lib/tokens.ts";
import { getReferenceSnapshot } from "@/lib/utils.ts";

export function OverviewOhmPrice() {
  const { data: history } = useOhmPriceHistory();
  const OHMToken = useToken(TokenName.OHM);

  const dataPoints = history?.dataPoints ?? [];
  const livePrice = OHMToken.price;
  const ref24h = getReferenceSnapshot(dataPoints, 24);
  const change24h =
    ref24h && livePrice > 0 ? ((livePrice - ref24h.price) / ref24h.price) * 100 : null;
  const isPositive = (change24h ?? 0) >= 0;

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
          {change24h !== null && <PriceChange percentage={change24h} timeframe="24h" />}
        </div>
      </div>

      <SparklineChart
        data={sparklineData}
        dataKey="price"
        isPositive={isPositive}
        valueLabel="OHM Price"
      />
    </Card>
  );
}
