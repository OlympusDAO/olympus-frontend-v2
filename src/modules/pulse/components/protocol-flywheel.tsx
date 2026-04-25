import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RevenueFlowDiagram } from "./protocol-revenue-flow";
import { ProtocolDataSource } from "./protocol-data-source";
import { useWeeklyRevenue } from "@/modules/pulse/hooks/useWeeklyRevenue";
import { useOhmPrice } from "@/lib/hooks/liveness/useOhmPrice";
import { useTreasuryMetrics } from "@/modules/pulse/hooks/useTreasuryMetrics";
import { useYrfHistory } from "@/modules/pulse/hooks/useYrfHistory";
import { getWeekStartUTC } from "@/lib/liveness/epoch";
import { formatUsd, formatNumber } from "@/lib/liveness/formatters";

export function ProtocolFlywheel() {
  const revenue = useWeeklyRevenue();
  const { data: price } = useOhmPrice();
  const { data: treasury } = useTreasuryMetrics();
  const { data: yrfHistory } = useYrfHistory();
  const isLoading = !revenue || !price || !treasury || !yrfHistory;

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
  const currentWeeklyYield = yrfHistory.currentWeeklyYield;

  // Last completed week: most recent week whose Monday is before the current ISO Monday.
  const currentMonday = getWeekStartUTC().toISOString().split("T")[0];
  const lastCompletedWeek = [...yrfHistory.weeklyYields]
    .reverse()
    .find((w) => w.weekStart < currentMonday && w.ohmBurned > 0);

  const capacityWeeklyBurns = ohmPrice > 0 ? currentWeeklyYield / ohmPrice : 0;
  const hasRealized = !!lastCompletedWeek;
  const weeklyBurns = hasRealized ? lastCompletedWeek.ohmBurned : capacityWeeklyBurns;
  const annualBurns = weeklyBurns * 52;

  const backing = treasury.treasuryLiquidBackingPerOhmBacked;
  const supplyReduction =
    treasury.ohmTotalSupply > 0 ? (annualBurns / treasury.ohmTotalSupply) * 100 : 0;

  const buybackSubtitle = hasRealized
    ? `Week of ${lastCompletedWeek.weekLabel} · ${formatUsd(lastCompletedWeek.usdSpent, true)}`
    : `${formatUsd(currentWeeklyYield, true)} YRF budget`;

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
        buybackSubtitle={buybackSubtitle}
        backingValue={formatUsd(backing)}
        deflationRate={supplyReduction.toFixed(2)}
      />
      <ProtocolDataSource
        sources={["YRF Subgraph", "Bond Subgraph", "Treasury API", "DefiLlama"]}
      />
    </Card>
  );
}
