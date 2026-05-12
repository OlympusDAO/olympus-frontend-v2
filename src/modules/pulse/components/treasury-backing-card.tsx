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
import { useTreasuryHistory } from "@/modules/pulse/hooks/useTreasuryHistory";
import { useTreasuryDataFreshness } from "@/modules/pulse/hooks/useTreasuryDataFreshness";
import goldenTexture from "@/assets/golden-texture.webp";

const USD_PER_OHM = {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
} as const;
const COMPACT_NUM = { style: "decimal", notation: "compact", maximumFractionDigits: 2 } as const;

const usdPerOhmFormatter = new Intl.NumberFormat("en-US", USD_PER_OHM);
const compactNumFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
});

const DAYS_OPTIONS = [
  { value: "30", label: "30d" },
  { value: "90", label: "90d" },
  { value: "365", label: "1y" },
  { value: "1825", label: "Max" },
];

const PRICE_COLOR = "var(--blue)";
const TOTAL_BACKING_COLOR = "var(--orange)";
const LIQUID_BACKING_COLOR = "var(--green)";
const BACKED_SUPPLY_COLOR = "var(--purple)";
const EVENT_COLOR = "var(--red)";

const CHART_EVENTS = [{ date: "2025-02-26", label: "V1 Migrator", color: EVENT_COLOR }];

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
  const price = payload.find((p) => p.dataKey === "ohmPrice")?.value ?? 0;
  const totalBacking = payload.find((p) => p.dataKey === "totalBackingPerOhm")?.value ?? 0;
  const lb = payload.find((p) => p.dataKey === "liquidBackingPerOhm")?.value ?? 0;
  const bs = payload.find((p) => p.dataKey === "backedSupply")?.value ?? 0;
  const dateStr = label ? format(parseISO(label), "MMMM d, yyyy, HH:mm 'UTC'") : "";

  return (
    <div className="bg-surface-tooltip shadow-tooltip flex flex-col gap-1.5 rounded-[20px] px-3 py-2">
      <p className="text-secondary-t text-center text-xs/4 font-semibold whitespace-nowrap">
        {dateStr}
      </p>
      <TooltipRow color={PRICE_COLOR} label="OHM Price" value={price} format={USD_PER_OHM} />
      <TooltipRow
        color={TOTAL_BACKING_COLOR}
        label="Total Backing / OHM"
        value={totalBacking}
        format={USD_PER_OHM}
      />
      <TooltipRow
        color={LIQUID_BACKING_COLOR}
        label="Liquid Backing / OHM"
        value={lb}
        format={USD_PER_OHM}
      />
      <TooltipRow
        color={BACKED_SUPPLY_COLOR}
        label="Backed Supply"
        value={bs}
        format={COMPACT_NUM}
      />
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
  const [days, setDays] = useState("90");
  const { data: historyPoints, isError } = useTreasuryHistory(Number(days));
  const { data: lagging } = useTreasuryDataFreshness();

  const chartData = historyPoints ?? [];
  const lastChartDate = chartData.length > 0 ? chartData[chartData.length - 1].date : undefined;
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
  // After downsampling caps points at 180, the 365 and 1825 ranges have the same point
  // count, so their tick intervals are picked to land ~6 and ~15 visible labels respectively.
  const tickInterval = days === "30" ? 6 : days === "90" ? 14 : days === "365" ? 30 : 12;

  return (
    <Card className="flex flex-col gap-5 p-5">
      <div className="flex min-w-0 flex-col gap-5">
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

      <div className="flex h-[360px] min-w-0 flex-col gap-4">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row sm:gap-2">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs/4 font-normal sm:justify-start">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: PRICE_COLOR }} />
              <span className="text-secondary-t">OHM Price</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: TOTAL_BACKING_COLOR }}
              />
              <span className="text-secondary-t">Total Backing / OHM</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: LIQUID_BACKING_COLOR }}
              />
              <span className="text-secondary-t">Liquid Backing / OHM</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: BACKED_SUPPLY_COLOR }}
              />
              <InfoTooltip title="Circulating Supply of OHM excluding OHM in Protocol Owned Liquidity">
                <span className="text-secondary-t">Backed Supply</span>
              </InfoTooltip>
            </div>
          </div>
          <Segmented
            size="sm"
            value={days}
            onValueChange={setDays}
            options={DAYS_OPTIONS}
            className="flex w-full sm:inline-flex sm:w-fit [&>[data-slot=tabs-trigger]]:flex-1 sm:[&>[data-slot=tabs-trigger]]:flex-initial"
            classNameTrigger="w-full sm:w-auto"
          />
        </div>

        {isError && chartData.length <= 1 ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 text-center">
            <p className="text-primary-t text-sm font-semibold">Chart data unavailable</p>
            <p className="max-w-sm text-secondary-t text-xs">
              The treasury history endpoint did not return data for this range. Try a shorter range.
            </p>
          </div>
        ) : chartData.length > 1 ? (
          <div className="min-h-0 flex-1 [&_*:focus]:outline-none [&_*]:outline-none">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gradPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PRICE_COLOR} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={PRICE_COLOR} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradMarket" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={TOTAL_BACKING_COLOR} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={TOTAL_BACKING_COLOR} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradLiquid" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={LIQUID_BACKING_COLOR} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={LIQUID_BACKING_COLOR} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradBacked" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={BACKED_SUPPLY_COLOR} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={BACKED_SUPPLY_COLOR} stopOpacity={0.02} />
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
                  tickFormatter={(v: number) => usdPerOhmFormatter.format(v)}
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
                  tickFormatter={(v: number) => compactNumFormatter.format(v)}
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
                  dataKey="ohmPrice"
                  stroke={PRICE_COLOR}
                  strokeWidth={1.5}
                  fill="url(#gradPrice)"
                  dot={false}
                  isAnimationActive={false}
                />

                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="totalBackingPerOhm"
                  stroke={TOTAL_BACKING_COLOR}
                  strokeWidth={1.5}
                  fill="url(#gradMarket)"
                  dot={false}
                  isAnimationActive={false}
                />

                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="liquidBackingPerOhm"
                  stroke={LIQUID_BACKING_COLOR}
                  strokeWidth={1.5}
                  fill="url(#gradLiquid)"
                  dot={false}
                  isAnimationActive={false}
                />

                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="backedSupply"
                  stroke={BACKED_SUPPLY_COLOR}
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
