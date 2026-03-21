import { Card } from "@/components/ui/card";
import { NumberFlow } from "@/components/ui/number-flow";
import { PriceChange } from "@/components/price-change";
import { TooltipInfo } from "@/components/ui/tooltip";
import { useBackingHistory } from "@/lib/hooks/liveness/useBackingHistory";
import { useTreasuryMetrics } from "@/modules/pulse/hooks/useTreasuryMetrics.ts";
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts";

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
  const gradientId = "premiumSparkGrad";

  return (
    <Card className="flex items-center justify-between gap-4 p-5">
      <div className="min-w-0">
        <TooltipInfo title="OHM Premium = OHM Price − Liquid Backing Per OHM. Represents how much the market values OHM above its backing.">
          <p className="mb-1 text-[15px]/[20px] font-semibold text-primary-t"> OHM Premium</p>
        </TooltipInfo>
        <div className="flex gap-x-2 mt-1">
          <NumberFlow
            value={premium > 0 ? premium : 0}
            className="tabular-nums text-2xl font-bold tracking-tight"
          />
          {dataPoints.length >= 2 && <PriceChange percentage={change24h} timeframe="24h" />}
        </div>
      </div>

      {premiumDataPoints.length > 1 && (
        <div className="w-55 shrink-0">
          <ResponsiveContainer width="100%" height={56}>
            <AreaChart data={premiumDataPoints} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={isPositive ? "var(--green)" : "var(--red)"}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="100%"
                    stopColor={isPositive ? "var(--green)" : "var(--red)"}
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
              <YAxis domain={["dataMin", "dataMax"]} hide />
              <Area
                type="monotone"
                dataKey="premium"
                stroke={isPositive ? "var(--green)" : "var(--red)"}
                strokeWidth={1.5}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
