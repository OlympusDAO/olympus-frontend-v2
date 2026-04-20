import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RevenueFlowDiagram } from "./protocol-revenue-flow";
import { ProtocolDataSource } from "./protocol-data-source";
import { useWeeklyRevenue } from "@/modules/pulse/hooks/useWeeklyRevenue";
import { useOhmPrice } from "@/lib/hooks/liveness/useOhmPrice";
import { useTreasuryMetrics } from "@/modules/pulse/hooks/useTreasuryMetrics";
import { formatUsd, formatNumber } from "@/lib/liveness/formatters";

export function ProtocolFlywheel() {
  const revenue = useWeeklyRevenue();
  const { data: price } = useOhmPrice();
  const { data: treasury } = useTreasuryMetrics();
  const isLoading = !revenue || !price || !treasury;

  if (isLoading) {
    return (
      <div>
        <p className="mb-4 text-sm font-semibold">Protocol Flywheel</p>
        <Card className="p-5">
          <Skeleton className="h-50 w-full rounded-xl" />
        </Card>
      </div>
    );
  }

  const ohmPrice = price.price;
  const weeklyBurns = ohmPrice > 0 ? revenue.totalWeekly / ohmPrice : 0;
  const annualBurns = weeklyBurns * 52;
  const backing = treasury.treasuryLiquidBackingPerOhmBacked;
  const supplyReduction =
    treasury.ohmTotalSupply > 0 ? (annualBurns / treasury.ohmTotalSupply) * 100 : 0;

  const flowSources = revenue.sources.map((s) => ({
    name: s.name,
    value: s.weeklyAmount,
    color: s.color,
    percentage: revenue.totalWeekly > 0 ? (s.weeklyAmount / revenue.totalWeekly) * 100 : 0,
  }));

  return (
    <Card className="p-5 flex flex-col">
      <p className="mb-4 text-sm font-semibold">Protocol Flywheel</p>
      <RevenueFlowDiagram
        sources={flowSources}
        totalRevenue={revenue.totalWeekly}
        weeklyBurns={weeklyBurns}
        weeklyBurnsFormatted={formatNumber(Math.round(weeklyBurns))}
        backingValue={formatUsd(backing)}
        deflationRate={supplyReduction.toFixed(2)}
      />
      <ProtocolDataSource sources={["Treasury API", "DefiLlama", "Cooler Subgraph"]} />
    </Card>
  );
}
