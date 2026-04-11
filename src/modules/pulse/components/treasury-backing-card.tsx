import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { Card } from "@/components/ui/card.tsx";
import { NumberFlow } from "@/components/ui/number-flow.tsx";
import { Segmented } from "@/components/ui/tabs.tsx";
import { useTreasuryMetrics } from "@/modules/pulse/hooks/useTreasuryMetrics";
import { useTreasuryHistory } from "@/modules/pulse/hooks/useTreasuryHistory";

const DECIMAL = { style: "decimal", notation: "standard" } as const;
const COMPACT_USD = {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
} as const;
const COMPACT_NUM = { notation: "compact", maximumFractionDigits: 2 } as const;

const DAYS_OPTIONS = [
  { value: "7", label: "7d" },
  { value: "30", label: "30d" },
  { value: "90", label: "90d" },
  { value: "180", label: "180d" },
  { value: "365", label: "1y" },
  { value: "1825", label: "All" },
];

const GREEN = "#4ade80";
const PURPLE = "#a78bfa";
const ORANGE = "#fb923c";

const CHART_EVENTS = [{ date: "2025-02-26", label: "V1 Migrator", color: "#f87171" }];

function formatCompactUsd(v: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);
}

function formatCompactNum(v: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(v);
}

interface ChartEntry {
  date: string;
  liquidBacking: number;
  backedSupply: number;
  marketValue: number;
}

interface TooltipEntry {
  dataKey?: string;
  value?: number;
}

function BackingTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const mv = payload.find((p) => p.dataKey === "marketValue")?.value ?? 0;
  const lb = payload.find((p) => p.dataKey === "liquidBacking")?.value ?? 0;
  const bs = payload.find((p) => p.dataKey === "backedSupply")?.value ?? 0;
  const dateStr = label ? format(parseISO(label), "MMM d, yyyy") : "";

  return (
    <div className="bg-surface-tooltip shadow-tooltip rounded-[20px] px-3 py-2 text-sm">
      <p className="text-secondary-t mb-1.5 text-xs">{dateStr}</p>
      <div className="flex items-center gap-2">
        <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: ORANGE }} />
        <span className="text-secondary-t">Market Value</span>
        <NumberFlow value={mv} format={COMPACT_USD} className="ml-auto font-semibold" />
      </div>
      <div className="flex items-center gap-2 mt-1">
        <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: GREEN }} />
        <span className="text-secondary-t">Liquid Backing</span>
        <NumberFlow value={lb} format={COMPACT_USD} className="ml-auto font-semibold" />
      </div>
      <div className="flex items-center gap-2 mt-1">
        <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: PURPLE }} />
        <span className="text-secondary-t">Backed Supply</span>
        <NumberFlow value={bs} format={COMPACT_NUM} className="ml-auto font-semibold" />
      </div>
    </div>
  );
}

function FormulaRow({
  label,
  value,
  bold,
  secondary,
  usd = true,
  prefix,
}: {
  label: string;
  value: number;
  bold?: boolean;
  secondary?: boolean;
  usd?: boolean;
  prefix?: string;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-4 ${secondary ? "text-secondary-t" : ""}`}
    >
      <p className={secondary ? "text-xs" : `text-sm ${bold ? "font-bold" : "font-medium"}`}>
        {label}
      </p>
      <NumberFlow
        value={value}
        format={!usd ? DECIMAL : undefined}
        prefix={prefix}
        className={`shrink-0 ${secondary ? "text-xs font-medium" : `text-sm ${bold ? "font-bold" : "font-medium"}`}`}
      />
    </div>
  );
}

export function TreasuryBackingCard() {
  const [days, setDays] = useState("7");
  const { data: metrics } = useTreasuryMetrics();
  const { data: historyPoints } = useTreasuryHistory(Number(days));

  const treasuryMarketValue = metrics?.treasuryMarketValue ?? 0;
  const liquidBacking = metrics?.treasuryLiquidBacking ?? 0;
  const ohmSideMarketValue = treasuryMarketValue - liquidBacking;
  const ohmTotalSupply = metrics?.ohmTotalSupply ?? 0;
  const ohmBackedSupply = metrics?.ohmBackedSupply ?? 0;
  const protocolOhmLps = ohmTotalSupply - ohmBackedSupply;
  const backingPerOhm = metrics?.treasuryLiquidBackingPerOhmBacked ?? 0;

  const chartData: ChartEntry[] = historyPoints ?? [];

  const tickInterval =
    days === "7"
      ? 1
      : days === "30"
        ? 6
        : days === "90"
          ? 14
          : days === "180"
            ? 30
            : days === "365"
              ? 60
              : 120;

  return (
    <Card className="flex flex-col gap-4 p-6">
      <h3 className="text-[18px]/[20px] font-semibold">Liquid Backing per Backed OHM</h3>

      <div className="grid grid-cols-2 max-md:grid-cols-1 gap-4">
        {/* LEFT: Formula */}
        <div className="flex flex-col ">
          {/* Numerator */}
          <div className="bg-surface-a3 flex flex-col gap-2 rounded-xl py-3.5 px-3">
            <p className="text-secondary-t mb-1 text-xs font-medium uppercase tracking-widest">
              Numerator – Liquid Backing
            </p>
            <FormulaRow label="Treasury Market Value" value={treasuryMarketValue} bold />
            <FormulaRow
              label="- OHM side Market Value (circular – OHM can't back itself)"
              value={ohmSideMarketValue}
              secondary
              prefix="-"
            />
            <div className="bg-a10-b my-1 h-px w-full" />
            <FormulaRow label="= Liquid Backing" value={liquidBacking} bold />
          </div>

          {/* Divider ÷ */}
          <div className="text-secondary-t text-center text-2xl font-light">÷</div>

          {/* Denominator */}
          <div className="bg-surface-a3 flex flex-col gap-2 rounded-xl py-3.5 px-3">
            <p className="text-secondary-t mb-1 text-[10px] font-medium uppercase tracking-widest">
              Denominator – Backed Supply
            </p>
            <FormulaRow label="Total OHM Supply" value={ohmTotalSupply} bold usd={false} />
            <FormulaRow
              label="- Protocol owned OHM LPs"
              value={protocolOhmLps}
              secondary
              usd={false}
              prefix="- "
            />
            <div className="bg-a10-b my-1 h-px w-full" />
            <FormulaRow label="= Backed Supply" value={ohmBackedSupply} bold usd={false} />
          </div>

          {/* = */}
          <div className="text-secondary-t text-center text-2xl font-light">=</div>

          {/* Result */}
          <div className="flex items-center justify-between rounded-xl bg-green/10 p-4">
            <p className="text-sm font-bold text-green">Liquid Backing per OHM</p>
            <NumberFlow value={backingPerOhm} className="text-xl font-bold text-green" />
          </div>
        </div>

        {/* RIGHT: Chart */}
        <div className="flex h-full max-md:h-80 flex-col gap-4 bg-surface-a3 rounded-xl py-3.5 px-3">
          {/* Legend + filter */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: ORANGE }} />
                <span className="text-secondary-t">Market Value</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: GREEN }} />
                <span className="text-secondary-t">Liquid Backing</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: PURPLE }} />
                <span className="text-secondary-t">Backed Supply</span>
              </div>
            </div>
            <Segmented size="sm" value={days} onValueChange={setDays} options={DAYS_OPTIONS} />
          </div>

          {/* Dual-axis chart */}
          {chartData.length > 1 ? (
            <div className="min-h-0 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                  <defs>
                    <linearGradient id="gradMarket" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={ORANGE} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={ORANGE} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradLiquid" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={GREEN} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={GREEN} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradBacked" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={PURPLE} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={PURPLE} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.07} />

                  <XAxis
                    dataKey="date"
                    interval={tickInterval}
                    tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(d: string) => format(parseISO(d), "MMM d")}
                  />

                  <YAxis
                    yAxisId="left"
                    orientation="left"
                    tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatCompactUsd}
                    domain={[
                      (min: number) => Math.floor(min * 0.97),
                      (max: number) => Math.ceil(max * 1.03),
                    ]}
                    tickCount={5}
                    width={56}
                  />

                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatCompactNum}
                    domain={[
                      (min: number) => Math.floor(min * 0.97),
                      (max: number) => Math.ceil(max * 1.03),
                    ]}
                    tickCount={5}
                    width={64}
                  />

                  <Tooltip content={<BackingTooltip />} />

                  {CHART_EVENTS.map((ev) => (
                    <ReferenceLine
                      key={ev.date}
                      x={ev.date}
                      yAxisId="left"
                      stroke={ev.color}
                      strokeDasharray="4 2"
                      strokeWidth={1}
                      label={{ value: ev.label, position: "top", fontSize: 10, fill: ev.color }}
                    />
                  ))}

                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="marketValue"
                    stroke={ORANGE}
                    strokeWidth={1.5}
                    fill="url(#gradMarket)"
                    dot={false}
                    isAnimationActive={false}
                  />

                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="liquidBacking"
                    stroke={GREEN}
                    strokeWidth={1.5}
                    fill="url(#gradLiquid)"
                    dot={false}
                    isAnimationActive={false}
                  />

                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="backedSupply"
                    stroke={PURPLE}
                    strokeWidth={1.5}
                    fill="url(#gradBacked)"
                    dot={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-surface-a3 flex h-70 items-center justify-center rounded-xl">
              <p className="text-secondary-t text-sm">Loading chart data…</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
