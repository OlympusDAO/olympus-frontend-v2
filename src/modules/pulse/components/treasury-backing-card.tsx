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
import { RiInformationLine } from "@remixicon/react";
import type { Format } from "@number-flow/react";
import { Card } from "@/components/ui/card.tsx";
import { NumberFlow } from "@/components/ui/number-flow.tsx";
import { Segmented } from "@/components/ui/tabs.tsx";
import { Spinner } from "@/components/spinner";
import { Tooltip as InfoTooltip } from "@/components/ui/tooltip.tsx";
import { useTreasuryMetrics } from "@/modules/pulse/hooks/useTreasuryMetrics";
import { useTreasuryHistory } from "@/modules/pulse/hooks/useTreasuryHistory";
import { useTreasuryDataFreshness } from "@/modules/pulse/hooks/useTreasuryDataFreshness";
import goldenTexture from "@/assets/golden-texture.webp";

const COMPACT_USD = {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
} as const;
const COMPACT_NUM = { notation: "compact", maximumFractionDigits: 2 } as const;

const DAYS_OPTIONS = [
  { value: "30", label: "30d" },
  { value: "90", label: "90d" },
  { value: "365", label: "1y" },
  { value: "1825", label: "Max" },
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
  const dateStr = label ? format(parseISO(label), "MMMM d, yyyy, HH:mm 'UTC'") : "";

  return (
    <div className="bg-surface-tooltip shadow-tooltip flex flex-col gap-1.5 rounded-[20px] px-3 py-2">
      <p className="text-secondary-t text-center text-xs/4 font-semibold whitespace-nowrap">
        {dateStr}
      </p>
      <TooltipRow color={ORANGE} label="Market Value" value={mv} format={COMPACT_USD} />
      <TooltipRow color={GREEN} label="Liquid Backing" value={lb} format={COMPACT_USD} />
      <TooltipRow color={PURPLE} label="Backed Supply" value={bs} format={COMPACT_NUM} />
    </div>
  );
}

function TooltipRow({
  color,
  label,
  value,
  format,
}: {
  color: string;
  label: string;
  value: number;
  format: Format;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-4">
      <div className="flex items-center gap-1.5">
        <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-secondary-t text-xs/4 font-normal whitespace-nowrap">{label}</span>
      </div>
      <NumberFlow
        value={value}
        format={format}
        className="text-primary-t text-xs/4 font-semibold whitespace-nowrap"
      />
    </div>
  );
}

export function TreasuryBackingCard() {
  const [days, setDays] = useState("30");
  const { data: metrics } = useTreasuryMetrics();
  const { data: historyPoints } = useTreasuryHistory(Number(days));
  const { data: lagging } = useTreasuryDataFreshness();

  const backingPerOhm = metrics?.treasuryLiquidBackingPerOhmBacked ?? 0;

  const chartData: ChartEntry[] = historyPoints ?? [];
  const lastChartDate = chartData.at(-1)?.date;
  const freshnessNote =
    lastChartDate && lagging && lagging.length > 0
      ? {
          throughDate: lastChartDate,
          callout: lagging
            .map(
              (l) =>
                `${l.chain} subgraph is ${l.daysBehind} day${l.daysBehind === 1 ? "" : "s"} behind`,
            )
            .join("; "),
        }
      : null;

  const tickInterval = days === "30" ? 6 : days === "90" ? 14 : days === "365" ? 60 : 120;

  return (
    <Card className="flex items-stretch gap-4 p-5 max-md:flex-col">
      <div className="flex flex-1 min-w-0 flex-col justify-between gap-5 self-stretch">
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-1.5">
            <h3 className="text-lg/6 font-semibold">Liquid Backing per Backed OHM</h3>
            {freshnessNote && (
              <InfoTooltip
                title={
                  <span className="text-xs/4">
                    Data through {format(parseISO(freshnessNote.throughDate), "MMM d, yyyy")}.{" "}
                    {freshnessNote.callout}.
                  </span>
                }
              >
                <RiInformationLine
                  size={16}
                  className="cursor-pointer text-tertiary-t transition-colors hover:text-secondary-t"
                />
              </InfoTooltip>
            )}
          </div>

          <div className="flex items-stretch gap-3">
            <div
              className="w-0.5 shrink-0 self-stretch rounded-full bg-cover bg-center"
              style={{ backgroundImage: `url(${goldenTexture})` }}
            />
            <div className="flex flex-col gap-2">
              <p className="text-sm/5 font-semibold">
                The Olympus treasury manages protocol assets primarily consisting of stables, LP
                positions and the Cooler loan book.
              </p>
              <p className="text-secondary-t text-xs/4 font-normal">
                All assets back OHM, except for the OHM side of LP positions to prevent OHM backing
                itself. The ratio of liquid backing to backed supply represents the floor value of
                real assets behind each OHM token.
              </p>
            </div>
          </div>
        </div>

        <div className="border-green/5 bg-green/10 flex items-center justify-between rounded-xl border px-6 py-5">
          <p className="text-green text-lg/6 font-semibold">Liquid Backing per OHM</p>
          <NumberFlow
            value={backingPerOhm}
            format={{
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }}
            className="text-green text-lg/6 font-semibold"
          />
        </div>
      </div>

      <div className="flex flex-1 min-w-0 max-md:h-80 flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-4 text-xs/4 font-normal">
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

        {chartData.length > 1 ? (
          <div className="min-h-0 flex-1 [&_*:focus]:outline-none [&_*]:outline-none">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
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
                  height={18}
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
                  width={56}
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
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2">
            <Spinner className="size-8" />
            <p className="text-secondary-t text-sm">Loading chart data</p>
          </div>
        )}
      </div>
    </Card>
  );
}
