import { Card } from "@/components/ui/card";
import { DataSource } from "./data-source";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipInfo } from "@/components/ui/tooltip";
import { useWeeklyRevenue } from "@/lib/hooks/liveness/useWeeklyRevenue";
import { useOhmPrice } from "@/lib/hooks/liveness/useOhmPrice";
import { useTreasuryMetrics } from "@/lib/hooks/useTreasuryMetrics";
import { useYrfHistory } from "@/lib/hooks/liveness/useYrfHistory";
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

export function YrfBuybackStats() {
  const revenue = useWeeklyRevenue();
  const { data: price } = useOhmPrice();
  const { data: treasury } = useTreasuryMetrics();
  const { data: yrfHistory } = useYrfHistory();
  const epoch = useEpochTimer();

  const isLoading = !revenue || !price || !treasury;

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

  const weeklyYield = revenue.totalWeekly;
  const ohmPrice = price.price;
  const weeklyBurns = ohmPrice > 0 ? weeklyYield / ohmPrice : 0;

  // Supply impact from YRF at current buyback rate
  const annualBurnsAtCurrentRate = weeklyBurns * 52;
  const supplyDeflationRate =
    treasury.ohmTotalSupply > 0
      ? (annualBurnsAtCurrentRate / treasury.ohmTotalSupply) * -100
      : 0;

  // YRF subgraph data
  const totalYieldDeployed = yrfHistory?.totalYieldDeployed ?? 0;
  const totalOhmBurned = yrfHistory?.totalOhmBurned ?? 0;
  const currentWeeklyYield = yrfHistory?.currentWeeklyYield ?? 0;

  // Current week actual spend from bond purchases (based on current calendar week)
  const allWeeks = yrfHistory?.weeklyYields ?? [];
  const currentWeekUsdSpent = yrfHistory?.currentWeekUsdSpent ?? 0;
  const budgetDeployed =
    currentWeeklyYield > 0
      ? (currentWeekUsdSpent / currentWeeklyYield) * 100
      : 0;

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
    <Card className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <TooltipInfo
          title="The Yield Repurchase Facility converts protocol revenue into OHM buybacks, creating continuous buy pressure."
          className="text-xs font-medium uppercase tracking-widest"
        >
          Yield Repurchase Facility
        </TooltipInfo>

        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-green" />
          <span className="text-xs text-secondary-t">Active</span>
        </div>
      </div>

      {/* Lifetime Burn Banner */}
      <div className="mb-5 rounded-2xl border border-green/10 bg-green/[0.03] px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <TooltipInfo
              title="Total OHM repurchased via YRF bond markets since inception (across v1.0, v1.1, v1.2)."
              className="text-xs text-tertiary-t"
            >
              Lifetime OHM Removed from Supply
            </TooltipInfo>
            <p className="mt-1 tabular-nums text-3xl font-bold tracking-tight">
              {totalOhmBurned > 0 ? (
                <>
                  <span className="bg-gradient-to-r from-green via-green/70 to-green bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer-green">
                    {formatNumber(Math.round(totalOhmBurned))}
                  </span>
                  <span className="ml-1.5 text-xl font-medium text-secondary-t">
                    OHM
                  </span>
                </>
              ) : (
                <span>{formatUsd(totalYieldDeployed, true)}</span>
              )}
            </p>
          </div>
          <div className="text-right">
            <TooltipInfo
              title={`At the current YRF buyback rate of ${formatNumber(weeklyBurns)} OHM/week, annualized supply change is ${formatNumber(Math.round(annualBurnsAtCurrentRate))} OHM. Does not account for potential CD conversions.`}
              className="text-xs text-tertiary-t"
            >
              Annual Supply Impact
            </TooltipInfo>
            <p className="mt-1 tabular-nums text-2xl font-bold text-green">
              {supplyDeflationRate.toFixed(2)}%
            </p>
            <p className="text-xs text-tertiary-t">
              -{formatNumber(Math.round(annualBurnsAtCurrentRate))} OHM/yr
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {/* This Week's Yield Budget */}
        <div className="space-y-2">
          <TooltipInfo
            title={`Weekly yield budget set by YRF contract: ${formatUsd(currentWeeklyYield)}. Actual spend can exceed budget via rollover from previous weeks. Today's market capacity: ${formatUsd(todayCapacity)}. Lifetime yield budgeted: ${formatUsd(totalYieldDeployed, true)}.`}
            className="text-xs text-tertiary-t"
          >
            This Week's Yield Budget
          </TooltipInfo>
          <p className="tabular-nums text-xl font-semibold">
            {formatUsd(currentWeeklyYield, true)}
          </p>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-tertiary-t">
              <span>Deployed</span>
              <span className="tabular-nums">
                {formatUsd(currentWeekUsdSpent, true)} (
                {budgetDeployed.toFixed(0)}%)
              </span>
            </div>
            <Progress
              value={budgetDeployed}
              className="h-1.5"
              indicatorClassName="bg-gradient-to-r from-green/40 to-green"
            />
          </div>
        </div>

        {/* Expected Weekly Burns */}
        <div className="space-y-2">
          <TooltipInfo
            title={`${formatUsd(weeklyYield)} weekly revenue / $${ohmPrice.toFixed(2)} OHM price = ${formatNumber(weeklyBurns)} OHM`}
            className="text-xs text-tertiary-t"
          >
            Est. Weekly Burns
          </TooltipInfo>
          <p className="tabular-nums text-xl font-semibold">
            {formatNumber(weeklyBurns)} OHM
          </p>
          <p className="text-xs text-tertiary-t">
            {formatUsd(weeklyBurns * ohmPrice, true)} value
          </p>
        </div>

        {/* Current Market Capacity */}
        <div className="space-y-2">
          <TooltipInfo
            title="The maximum amount of OHM the YRF can purchase in the current epoch. Resets each beat."
            className="text-xs text-tertiary-t"
          >
            Current Capacity
          </TooltipInfo>
          <p className="tabular-nums text-xl font-semibold">
            {formatUsd(todayCapacity, true)}
          </p>
          <p className="tabular-nums text-xs text-tertiary-t">
            Resets in {pad(epoch.hours)}:{pad(epoch.minutes)}:{pad(epoch.seconds)}
          </p>
        </div>
      </div>

      {/* Weekly OHM Burned Chart */}
      {chartData.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-secondary-t">
            {hasBondData
              ? "OHM Repurchased per Week"
              : "Est. OHM Repurchased per Week"}
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 0, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="gradYrfBurn" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--green)"
                    stopOpacity={0.05}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--green)"
                    stopOpacity={0.4}
                  />
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
                    <div className="rounded-lg border border-a10-b bg-surface-tooltip px-3 py-2 text-sm shadow-lg">
                      <p className="font-medium">Week of {data.name}</p>
                      <p className="tabular-nums text-green">
                        {formatNumber(data.ohmBurned)} OHM
                      </p>
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
      <DataSource sources={["YRF Subgraph", "Bond Subgraph", "Treasury API"]} />
    </Card>
  );
}
