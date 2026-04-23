import { Card } from "@/components/ui/card";
import { ProtocolDataSource } from "./protocol-data-source";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipInfo } from "@/components/ui/tooltip";
import { useOhmPrice } from "@/lib/hooks/liveness/useOhmPrice";
import { useTreasuryMetrics } from "@/modules/pulse/hooks/useTreasuryMetrics";
import { useYrfHistory } from "@/modules/pulse/hooks/useYrfHistory";
import { useEpochTimer } from "@/lib/hooks/liveness/useEpochTimer";
import { formatUsd, formatNumber } from "@/lib/liveness/formatters";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { PulseDot } from "@/components/pulse-dot.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Icon } from "@/components/icon.tsx";
import { NumberFlow } from "@/components/ui/number-flow.tsx";
import { CircleProgress } from "@/components/ui/progress.tsx";
import { ColorModeImage } from "@/components/color-mode-wrapper.tsx";
import iconLight from "@/assets/protocol-1-b.png";
import iconDark from "@/assets/protocol-1-l.png";

export function ProtocolYrf() {
  const { data: price } = useOhmPrice();
  const { data: treasury } = useTreasuryMetrics();
  const { data: yrfHistory } = useYrfHistory();
  const epoch = useEpochTimer();

  const isLoading = !price || !treasury || !yrfHistory;

  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="mb-4 h-4 w-48" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </Card>
    );
  }

  const ohmPrice = price.price;

  // YRF subgraph data
  const totalYieldDeployed = yrfHistory.totalYieldDeployed;
  const totalOhmBurned = yrfHistory.totalOhmBurned;
  const currentWeeklyYield = yrfHistory.currentWeeklyYield;

  // Supply impact from YRF at current on-chain buyback rate
  const weeklyBurns = ohmPrice > 0 ? currentWeeklyYield / ohmPrice : 0;
  const annualBurnsAtCurrentRate = weeklyBurns * 52;
  const supplyDeflationRate =
    treasury.ohmTotalSupply > 0 ? (annualBurnsAtCurrentRate / treasury.ohmTotalSupply) * -100 : 0;

  // Current week actual spend from bond purchases (based on current calendar week)
  const allWeeks = yrfHistory?.weeklyYields ?? [];
  const currentWeekUsdSpent = yrfHistory?.currentWeekUsdSpent ?? 0;
  const budgetDeployed =
    currentWeeklyYield > 0 ? (currentWeekUsdSpent / currentWeeklyYield) * 100 : 0;

  // Today's market capacity (most recent bid amount from YRF contract)
  const todayCapacity = yrfHistory?.recentBids?.[0]?.bidAmount ?? 0;

  // Countdown to next beat (capacity resets each epoch)
  const pad = (n: number) => n.toString().padStart(2, "0");

  // Chart: last 12 weeks — use actual bond purchase data, fall back to estimate
  const hasBondData = allWeeks.some((w) => w.ohmBurned > 0);
  const chartData = allWeeks.slice(-12).map((w) => ({
    name: w.weekLabel,
    ohmBurned:
      w.ohmBurned > 0
        ? -Math.round(w.ohmBurned)
        : ohmPrice > 0
          ? -Math.round(w.yieldDeployed / ohmPrice)
          : 0,
    usdSpent: w.usdSpent,
    yieldBudget: w.yieldDeployed,
  }));

  return (
    <Card className="p-5">
      <div className=" flex items-center justify-between">
        <TooltipInfo title="The Yield Repurchase Facility converts protocol revenue into OHM buybacks, creating continuous buy pressure.">
          <p className="text-[15px]/[20px] font-semibold text-primary-t">
            Yield Repurchase Facility
          </p>
        </TooltipInfo>
        <div className="flex items-center gap-2 ">
          <PulseDot variant="green" />
          <span className="text-xs text-secondary-t">Active</span>
        </div>
      </div>
      <div className="flex items-center gap-4 mt-4">
        <ColorModeImage
          srcDark={iconDark}
          srcLight={iconLight}
          alt="YRF Icon"
          className="min-w-18 h-18"
        />
        <div>
          <p className="text-[15px]/[20px] font-semibold mb-1">
            Treasury yield is converted into OHM demand
          </p>
          <p className="text-secondary-t text-xs">
            The Yield Repurchase Facility uses protocol revenue to buy back and burn OHM each week.
            Backing from burned OHM is reclaimed and recycled, amplifying buying power.
          </p>
        </div>
      </div>
      <Separator className="my-4" />
      {/* Lifetime Burn Banner */}
      <div className="flex items-center justify-between w-full">
        <div className="w-full">
          <TooltipInfo title="Total OHM repurchased via YRF bond markets since inception (across v1.0, v1.1, v1.2).">
            <p className="text-xs">Lifetime OHM Removed from Supply</p>
          </TooltipInfo>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-x-2">
              <Icon name="OHMColorTokenIcon" />
              <NumberFlow
                format={{ style: "decimal", notation: "standard" }}
                value={totalOhmBurned}
                className="text-[32px]/[40px] font-semibold"
              />
            </div>
            <div>
              <div className="flex justify-end">
                <TooltipInfo
                  title={`At the current YRF buyback rate of ${formatNumber(weeklyBurns)} OHM/week, annualized supply change is ${formatNumber(Math.round(annualBurnsAtCurrentRate))} OHM. Does not account for potential CD conversions.`}
                >
                  <p className="text-xs">Annual Supply Impact</p>
                </TooltipInfo>
              </div>
              <div className="flex items-center gap-x-1">
                <NumberFlow
                  format={{ style: "percent", notation: "standard" }}
                  value={supplyDeflationRate / 100}
                  className="text-[15px]/[20px] font-semibold"
                />
                <NumberFlow
                  format={{ style: "decimal", notation: "compact" }}
                  suffix="OHM/yr"
                  value={annualBurnsAtCurrentRate}
                  className="text-[15px]/[20px] text-secondary-t"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Separator className="my-4" />

      <div className="grid grid-cols-2 gap-x-8 gap-y-5">
        {/* Weekly Yield Budget */}
        <div className="space-y-1">
          <TooltipInfo
            title={`Weekly yield budget set by YRF contract: ${formatUsd(currentWeeklyYield)}. Actual spend can exceed budget via rollover from previous weeks. Today's market capacity: ${formatUsd(todayCapacity)}. Lifetime yield budgeted: ${formatUsd(totalYieldDeployed, true)}.`}
            className="text-xs text-tertiary-t"
          >
            Weekly Yield Budget
          </TooltipInfo>
          <div className="flex items-center gap-x-1">
            <CircleProgress value={Math.min(budgetDeployed, 100)} size={18} strokeWidth={2.5} />
            <div className="tabular-nums text-[15px]/[20px] font-semibold">
              <div className="flex items-center gap-x-0.5">
                <NumberFlow value={currentWeekUsdSpent} className="text-[15px]/[20px]" /> /
                <NumberFlow value={currentWeeklyYield} className="text-[15px]/[20px]" />
                <span className="text-[15px]/[20px] text-secondary-t font-normal flex items-center">
                  (<NumberFlow format={{ style: "percent" }} value={budgetDeployed / 100} />)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Est. Weekly Burns */}
        <div className="space-y-1">
          <TooltipInfo
            title={`${formatUsd(currentWeeklyYield)} weekly YRF budget / $${ohmPrice.toFixed(2)} OHM price = ${formatNumber(weeklyBurns)} OHM`}
            className="text-xs text-tertiary-t"
          >
            Est. Weekly Burns
          </TooltipInfo>
          <div className="tabular-nums text-[15px]/[20px] font-semibold">
            <div className="flex items-center gap-x-0.5">
              <NumberFlow
                format={{ style: "decimal", notation: "standard" }}
                suffix="OHM"
                value={Math.round(weeklyBurns)}
                className="text-[15px]/[20px]"
              />
              <span className="text-[15px]/[20px] text-secondary-t font-normal flex items-center">
                ({formatUsd(weeklyBurns * ohmPrice, true)})
              </span>
            </div>
          </div>
        </div>

        {/* Current Capacity */}
        <div className="space-y-1">
          <TooltipInfo
            title="The maximum amount of OHM the YRF can purchase in the current epoch. Resets each beat."
            className="text-xs text-tertiary-t"
          >
            Current Capacity
          </TooltipInfo>
          <p className="tabular-nums text-[15px]/[20px] font-semibold">
            <NumberFlow value={todayCapacity} />{" "}
            <span className="font-normal text-secondary-t">
              Resets in {pad(epoch.hours)}:{pad(epoch.minutes)}:{pad(epoch.seconds)}
            </span>
          </p>
        </div>
      </div>

      <Separator className="my-4" />
      {/* Weekly OHM Burned Chart */}
      {chartData.length > 0 && (
        <div className="">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-secondary-t">
            {hasBondData ? "OHM Repurchased per Week" : "Est. OHM Repurchased per Week"}
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 5, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gradYrfBurn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--green)" stopOpacity={0.05} />
                  <stop offset="100%" stopColor="var(--green)" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-a10)" vertical={false} />
              <XAxis
                dataKey="name"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--text-tertiary)" }}
              />
              <YAxis
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--text-tertiary)" }}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}K`}
                domain={["dataMin", 0]}
              />
              <RechartsTooltip
                cursor={{ fill: "var(--surface-a5)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-lg border border-a10-b bg-surface-tooltip px-3 py-2 text-sm shadow-lg">
                      <p className="font-medium">Week of {data.name}</p>
                      <p className="tabular-nums text-green">{formatNumber(data.ohmBurned)} OHM</p>
                      <p className="text-xs text-tertiary-t">
                        {data.usdSpent > 0
                          ? `${formatUsd(data.usdSpent, true)} spent`
                          : `${formatUsd(data.yieldBudget, true)} budget`}
                      </p>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="ohmBurned"
                fill="url(#gradYrfBurn)"
                radius={[0, 0, 3, 3]}
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <ProtocolDataSource sources={["YRF Subgraph", "Bond Subgraph", "Treasury API"]} />
    </Card>
  );
}
