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
import iconLight from "@/assets/protocol-1-b.webp";
import iconDark from "@/assets/protocol-1-l.webp";

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
    <Card className="p-5 flex flex-col">
      <div className="flex items-center justify-between">
        <TooltipInfo title="The Yield Repurchase Facility converts protocol revenue into OHM buybacks, creating continuous buy pressure.">
          <p className="text-sm font-semibold text-primary-t">Yield Repurchase Facility</p>
        </TooltipInfo>
        <div className="flex items-center gap-2">
          <span className="text-xs text-secondary-t">Active</span>
          <PulseDot variant="green" />
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
          <p className="text-sm font-semibold mb-1">Treasury yield is converted into OHM demand</p>
          <p className="text-secondary-t text-xs font-normal">
            The Yield Repurchase Facility uses protocol revenue to buy back and burn OHM each week.
            Backing from burned OHM is reclaimed and recycled, amplifying buying power. As protocol
            yield grows, the buyback power of the YRF scales accordingly.
          </p>
        </div>
      </div>
      <Separator className="my-4" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col">
          {/* Lifetime Burn Banner */}
          <div className="space-y-1">
            <TooltipInfo title="Total OHM repurchased via YRF bond markets since inception (across v1.0, v1.1, v1.2).">
              <p className="text-sm font-normal text-secondary-t">Lifetime OHM Repurchased</p>
            </TooltipInfo>
            <div className="flex items-center gap-x-2">
              <Icon name="OHMTokenIcon" size={28} />
              <NumberFlow
                format={{ style: "decimal", notation: "standard" }}
                value={totalOhmBurned}
                className="text-[32px]/[40px] font-semibold [--number-flow-char-height:1.25em]"
              />
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-2 gap-y-5">
            {/* Weekly Yield Budget */}
            <div className="space-y-0.5">
              <TooltipInfo
                title={`Weekly yield budget set by YRF contract: ${formatUsd(currentWeeklyYield)}. Actual spend can exceed budget via rollover from previous weeks. Today's market capacity: ${formatUsd(todayCapacity)}. Lifetime yield budgeted: ${formatUsd(totalYieldDeployed, true)}.`}
                className="text-xs font-normal text-secondary-t"
              >
                Weekly Yield Budget
              </TooltipInfo>
              <div className="flex items-center gap-x-1">
                <CircleProgress value={Math.min(budgetDeployed, 100)} size={18} strokeWidth={2.5} />
                <div className="text-sm font-semibold">
                  <div className="flex items-center gap-x-1">
                    <NumberFlow value={currentWeekUsdSpent} className="text-sm" /> /
                    <NumberFlow value={currentWeeklyYield} className="text-sm" />
                    <span className="text-sm text-secondary-t font-normal flex items-center">
                      (<NumberFlow format={{ style: "percent" }} value={budgetDeployed / 100} />)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Annual Supply Impact */}
            <div className="space-y-0.5">
              <TooltipInfo
                title={`At the current YRF buyback rate of ${formatNumber(weeklyBurns)} OHM/week, annualized supply change is ${formatNumber(Math.round(annualBurnsAtCurrentRate))} OHM. Does not account for potential CD conversions.`}
                className="text-xs font-normal text-secondary-t"
              >
                Annual Supply Impact
              </TooltipInfo>
              <div className="flex items-center gap-x-1">
                <NumberFlow
                  format={{ style: "percent", notation: "standard" }}
                  value={supplyDeflationRate / 100}
                  className="text-sm font-semibold"
                />
                <NumberFlow
                  format={{ style: "decimal", notation: "compact" }}
                  suffix="OHM/yr"
                  value={annualBurnsAtCurrentRate}
                  className="text-sm font-normal text-secondary-t"
                />
              </div>
            </div>

            {/* Est. Weekly Burns */}
            <div className="space-y-0.5">
              <TooltipInfo
                title={`${formatUsd(currentWeeklyYield)} weekly YRF budget / $${ohmPrice.toFixed(2)} OHM price = ${formatNumber(weeklyBurns)} OHM`}
                className="text-xs font-normal text-secondary-t"
              >
                Est. Weekly Burns
              </TooltipInfo>
              <div className="text-sm font-semibold">
                <div className="flex items-center gap-x-1">
                  <NumberFlow
                    format={{ style: "decimal", notation: "standard" }}
                    suffix="OHM"
                    value={Math.round(weeklyBurns)}
                    className="text-sm"
                  />
                  <span className="text-sm text-secondary-t font-normal flex items-center">
                    ({formatUsd(weeklyBurns * ohmPrice, true)})
                  </span>
                </div>
              </div>
            </div>

            {/* Current Capacity */}
            <div className="space-y-0.5">
              <TooltipInfo
                title="The maximum amount of OHM the YRF can purchase in the current epoch. Resets each beat."
                className="text-xs font-normal text-secondary-t"
              >
                Current Capacity
              </TooltipInfo>
              <p className="text-sm font-semibold">
                <NumberFlow value={todayCapacity} />{" "}
                <span className="font-normal text-secondary-t">
                  Resets in {pad(epoch.hours)}:{pad(epoch.minutes)}:{pad(epoch.seconds)}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Weekly OHM Burned Chart */}
        {chartData.length > 0 && (
          <div className="flex flex-col [&_*:focus]:outline-none [&_*:focus-visible]:outline-none">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-primary-t">
              {hasBondData ? "OHM Repurchased per Week" : "Est. OHM Repurchased per Week"}
            </p>
            <div className="flex-1 min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 0, bottom: 0, left: -30 }}>
                  <defs>
                    <linearGradient id="gradYrfBurn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--green)" stopOpacity={0.05} />
                      <stop offset="100%" stopColor="var(--green)" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border-a10)"
                    vertical={false}
                  />
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
                        <div className="bg-surface-tooltip shadow-tooltip flex flex-col gap-1.5 rounded-[20px] px-3 py-2">
                          <p className="text-secondary-t text-center text-xs/4 font-semibold whitespace-nowrap">
                            Week of {data.name}
                          </p>
                          <div className="flex w-full items-center justify-between gap-4">
                            <div className="flex items-center gap-1.5">
                              <span className="size-2.5 shrink-0 rounded-full bg-green" />
                              <span className="text-secondary-t text-xs/4 font-normal whitespace-nowrap">
                                OHM Burned
                              </span>
                            </div>
                            <span className="text-primary-t text-xs/4 font-semibold whitespace-nowrap">
                              {formatNumber(data.ohmBurned)}
                            </span>
                          </div>
                          <div className="flex w-full items-center justify-between gap-4">
                            <span className="text-secondary-t text-xs/4 font-normal whitespace-nowrap">
                              {data.usdSpent > 0 ? "Spent" : "Budget"}
                            </span>
                            <span className="text-primary-t text-xs/4 font-semibold whitespace-nowrap">
                              {data.usdSpent > 0
                                ? formatUsd(data.usdSpent, true)
                                : formatUsd(data.yieldBudget, true)}
                            </span>
                          </div>
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
          </div>
        )}
      </div>
      <ProtocolDataSource sources={["YRF Subgraph", "Bond Subgraph", "Treasury API"]} />
    </Card>
  );
}
