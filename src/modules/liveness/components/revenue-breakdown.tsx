import { Card } from "@/components/ui/card";
import { DataSource } from "./data-source";
import { Skeleton } from "@/components/ui/skeleton";
import { useWeeklyRevenue } from "@/lib/hooks/liveness/useWeeklyRevenue";
import type { LpBreakdownItem } from "@/lib/hooks/liveness/useWeeklyRevenue";
import { formatUsd } from "@/lib/liveness/formatters";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const GRADIENT_COLORS: Record<string, { color: string; id: string }> = {
  "sUSDe Yield": { color: "var(--blue)", id: "gradSusde" },
  "sUSDS Yield": { color: "var(--purple)", id: "gradSusds" },
  "Cooler Interest": { color: "var(--green)", id: "gradCooler" },
  "CD Borrow Interest": { color: "var(--orange)", id: "gradCd" },
  "LP Fees": { color: "var(--yellow)", id: "gradLp" },
};

function shortLpName(name: string) {
  return name
    .replace("Liquidity Pool", "")
    .replace("Uniswap V3 ", "Uni v3 ")
    .replace("Beradrome Kodiak ", "Kodiak ")
    .trim();
}

function ChartTooltip({
  active,
  payload,
  lpBreakdown,
}: {
  active?: boolean;
  payload?: Array<{ payload: { name: string; value: number; pct: string } }>;
  lpBreakdown: LpBreakdownItem[];
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  const isLp = data.name === "LP Fees";

  return (
    <div className="rounded-lg border border-a10-b bg-surface-tooltip px-3 py-2 text-sm shadow-lg">
      <p className="font-medium">{data.name}</p>
      <p className="tabular-nums text-secondary-t">
        {formatUsd(data.value)} ({data.pct}%)
      </p>
      {isLp && lpBreakdown.length > 0 && (
        <div className="mt-2 space-y-1 border-t border-a10-b pt-2">
          {lpBreakdown.map((lp) => (
            <div
              key={lp.name}
              className="flex items-center justify-between gap-4 text-xs text-secondary-t"
            >
              <span>{shortLpName(lp.name)}</span>
              <span className="tabular-nums text-tertiary-t">
                {lp.apy > 0
                  ? `${formatUsd(lp.value, true)} @ ${lp.apy.toFixed(1)}%`
                  : `${formatUsd(lp.value, true)} · N/A`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function RevenueBreakdown() {
  const revenue = useWeeklyRevenue();

  if (!revenue) {
    return (
      <Card className="p-6">
        <Skeleton className="mb-4 h-4 w-48" />
        <Skeleton className="h-[260px] w-full rounded-xl" />
      </Card>
    );
  }

  const chartData = revenue.sources
    .map((s) => ({
      name: s.name,
      value: s.weeklyAmount,
      color: s.color,
      pct:
        revenue.totalWeekly > 0 ? ((s.weeklyAmount / revenue.totalWeekly) * 100).toFixed(0) : "0",
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-widest text-secondary-t">
          Revenue Sources
        </p>
        <p className="tabular-nums text-sm text-secondary-t">
          {formatUsd(revenue.totalWeekly, true)}/week
        </p>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        >
          <defs>
            {Object.values(GRADIENT_COLORS).map(({ color, id }) => (
              <linearGradient key={id} id={id} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={color} stopOpacity={0.05} />
                <stop offset="100%" stopColor={color} stopOpacity={0.4} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-a10)" horizontal={false} />
          <XAxis
            type="number"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--text-secondary)" }}
            tickFormatter={(v: number) => formatUsd(v, true)}
          />
          <YAxis
            type="category"
            dataKey="name"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={120}
            tick={{ fill: "var(--text-primary)" }}
          />
          <RechartsTooltip
            cursor={{ fill: "var(--surface-a5)" }}
            content={({ active, payload }) => (
              <ChartTooltip
                active={active}
                payload={
                  payload as Array<{ payload: { name: string; value: number; pct: string } }>
                }
                lpBreakdown={revenue.lpBreakdown}
              />
            )}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={28}>
            {chartData.map((entry, index) => (
              <Cell
                key={entry.name}
                fill={`url(#${GRADIENT_COLORS[entry.name]?.id ?? "gradSusde"})`}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <DataSource sources={["Treasury API", "DefiLlama", "Cooler Subgraph", "CD Subgraph"]} />
    </Card>
  );
}
