import { Card } from "@/components/ui/card";
import { useOhmPriceHistory } from "@/modules/pulse/hooks/useOhmPriceHistory.ts";
import { SparklineChart } from "@/components/ui/sparkline-chart.tsx";
import { NumberFlow } from "@/components/ui/number-flow.tsx";
import { PriceChange } from "@/components/price-change.tsx";
import { useToken } from "@/lib/hooks/useToken.tsx";
import { TokenName } from "@/lib/tokens.ts";

export function OverviewOhmPrice() {
  const { data: history } = useOhmPriceHistory();
  const OHMToken = useToken(TokenName.OHM);

  const change24h = history?.change24h ?? 0;
  const dataPoints = history?.dataPoints ?? [];
  const isPositive = change24h >= 0;

  return (
    <Card className="flex items-center justify-between gap-4 p-5 max-xs:flex-col max-xs:items-start">
      <div className="min-w-0">
        <p className="mb-1 text-sm/5 font-semibold">OHM Price</p>
        <div className="flex gap-x-2">
          <NumberFlow
            value={OHMToken.price}
            className="tabular-nums text-xl/6 font-semibold tracking-tight"
          />
          {history && <PriceChange percentage={change24h} timeframe="24h" />}
        </div>
      </div>

      <SparklineChart
        data={dataPoints}
        dataKey="price"
        isPositive={isPositive}
        valueLabel="OHM Price"
      />
    </Card>
  );
}
