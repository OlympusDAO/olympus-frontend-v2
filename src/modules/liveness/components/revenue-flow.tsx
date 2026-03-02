import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { formatUsd } from "@/lib/liveness/formatters";

interface FlowSource {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

interface RevenueFlowProps {
  sources: FlowSource[];
  totalRevenue: number;
  weeklyBurns: number;
  weeklyBurnsFormatted: string;
  backingValue: string;
  deflationRate: string;
}

/** Build a filled SVG path for a flow band between two vertical spans */
function flowBandPath(
  sx: number,
  syTop: number,
  syBot: number,
  tx: number,
  tyTop: number,
  tyBot: number,
): string {
  const cx1 = sx + (tx - sx) * 0.45;
  const cx2 = sx + (tx - sx) * 0.55;
  return [
    `M ${sx} ${syTop}`,
    `C ${cx1} ${syTop}, ${cx2} ${tyTop}, ${tx} ${tyTop}`,
    `L ${tx} ${tyBot}`,
    `C ${cx2} ${tyBot}, ${cx1} ${syBot}, ${sx} ${syBot}`,
    "Z",
  ].join(" ");
}

/** Center bezier for animateMotion */
function flowCenterPath(sx: number, syMid: number, tx: number, tyMid: number): string {
  const cx1 = sx + (tx - sx) * 0.45;
  const cx2 = sx + (tx - sx) * 0.55;
  return `M ${sx} ${syMid} C ${cx1} ${syMid}, ${cx2} ${tyMid}, ${tx} ${tyMid}`;
}

const MIN_BAND = 4;
const NODE_PAD = 6;

function allocateBands(
  values: number[],
  totalHeight: number,
  padding: number,
): Array<{ start: number; height: number }> {
  const total = values.reduce((s, v) => s + v, 0);
  if (total === 0) return values.map(() => ({ start: 0, height: 0 }));

  const usable = totalHeight - padding * (values.length - 1);
  let rawHeights = values.map((v) => (v / total) * usable);

  const clamped = rawHeights.map((h) => Math.max(h, MIN_BAND));
  const clampedTotal = clamped.reduce((s, h) => s + h, 0);
  const scale = usable / clampedTotal;
  rawHeights = clamped.map((h) => h * scale);

  const result: Array<{ start: number; height: number }> = [];
  let y = 0;
  for (let i = 0; i < rawHeights.length; i++) {
    result.push({ start: y, height: rawHeights[i] });
    y += rawHeights[i] + padding;
  }
  return result;
}

function colorId(color: string): string {
  return color.replace(/[^a-zA-Z]/g, "");
}

interface FlowPaths {
  inflows: Array<{
    band: string;
    center: string;
    color: string;
    gradId: string;
  }>;
  outflow: { band: string; center: string } | null;
  verticalConnector: { x: number; y1: number; y2: number } | null;
}

export function RevenueFlowDiagram({
  sources,
  totalRevenue,
  weeklyBurnsFormatted,
  backingValue,
  deflationRate,
}: RevenueFlowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sourceRefs = useRef<(HTMLDivElement | null)[]>([]);
  const centerRef = useRef<HTMLDivElement>(null);
  const buybackRef = useRef<HTMLDivElement>(null);
  const backingRef = useRef<HTMLDivElement>(null);
  const [flowPaths, setFlowPaths] = useState<FlowPaths>({
    inflows: [],
    outflow: null,
    verticalConnector: null,
  });

  const sortedSources = useMemo(() => [...sources].sort((a, b) => b.value - a.value), [sources]);

  const computePaths = useCallback(() => {
    const container = containerRef.current;
    const center = centerRef.current;
    const buyback = buybackRef.current;
    const backing = backingRef.current;
    if (!container || !center || !buyback) return;

    const cRect = container.getBoundingClientRect();
    const centerRect = center.getBoundingClientRect();
    const buybackRect = buyback.getBoundingClientRect();

    // Left → Center flow bands
    const sourceEls = sourceRefs.current.filter(Boolean) as HTMLDivElement[];
    if (sourceEls.length !== sortedSources.length) return;

    const values = sortedSources.map((s) => s.value);
    const centerH = centerRect.height;
    const bands = allocateBands(values, centerH, NODE_PAD);
    const centerLeft = centerRect.left - cRect.left;
    const centerTop = centerRect.top - cRect.top;

    const inflows = sourceEls.map((el, i) => {
      const sRect = el.getBoundingClientRect();
      const sx = sRect.right - cRect.left;
      const sMidY = sRect.top - cRect.top + sRect.height / 2;
      const bandH = bands[i].height;
      const halfBand = bandH / 2;

      const tyTop = centerTop + bands[i].start;
      const tyBot = tyTop + bandH;
      const tyMid = (tyTop + tyBot) / 2;

      return {
        band: flowBandPath(sx, sMidY - halfBand, sMidY + halfBand, centerLeft, tyTop, tyBot),
        center: flowCenterPath(sx, sMidY, centerLeft, tyMid),
        color: sortedSources[i].color,
        gradId: `flow-${colorId(sortedSources[i].color)}`,
      };
    });

    // Center → Buyback flow band
    const centerRight = centerRect.right - cRect.left;
    const centerMidY = centerTop + centerH / 2;
    const buybackLeft = buybackRect.left - cRect.left;
    const buybackTop = buybackRect.top - cRect.top;
    const buybackMidY = buybackTop + buybackRect.height / 2;
    const outBandH = Math.min(centerH * 0.6, buybackRect.height * 0.6);

    const outflow = {
      band: flowBandPath(
        centerRight,
        centerMidY - outBandH / 2,
        centerMidY + outBandH / 2,
        buybackLeft,
        buybackMidY - outBandH / 2,
        buybackMidY + outBandH / 2,
      ),
      center: flowCenterPath(centerRight, centerMidY, buybackLeft, buybackMidY),
    };

    // Vertical connector: Buyback → Backing
    let verticalConnector: FlowPaths["verticalConnector"] = null;
    if (backing) {
      const backingRect = backing.getBoundingClientRect();
      const bbBottom = buybackRect.bottom - cRect.top;
      const bkTop = backingRect.top - cRect.top;
      const midX = buybackLeft + buybackRect.width / 2;
      verticalConnector = { x: midX, y1: bbBottom, y2: bkTop };
    }

    setFlowPaths({ inflows, outflow, verticalConnector });
  }, [sortedSources]);

  useEffect(() => {
    computePaths();
    const observer = new ResizeObserver(computePaths);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [computePaths]);

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <>
      {/* Desktop: Sankey flow */}
      <div ref={containerRef} className="relative hidden md:block">
        {/* SVG flow layer */}
        <svg
          role="img"
          aria-label="flow-layer"
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        >
          <defs>
            {sortedSources.map((s) => {
              const id = `flow-${colorId(s.color)}`;
              return (
                <linearGradient key={id} id={id} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0.08} />
                </linearGradient>
              );
            })}
            <linearGradient id="flow-out" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--green)" stopOpacity={0.2} />
              <stop offset="100%" stopColor="var(--green)" stopOpacity={0.08} />
            </linearGradient>
          </defs>

          {/* Source → Center bands */}
          {flowPaths.inflows.map((p, i) => (
            <g key={p.gradId}>
              {/* biome-ignore lint/a11y/useSemanticElements: SVG path cannot be replaced with <button> */}
              <path
                role="button"
                tabIndex={0}
                d={p.band}
                fill={`url(#${p.gradId})`}
                className="pointer-events-auto"
                style={{
                  opacity: hoveredIndex === null || hoveredIndex === i ? 1 : 0.2,
                  transition: "opacity 150ms",
                }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
              <circle r="2.5" fill={p.color} opacity="0.6">
                <animateMotion dur="2.5s" repeatCount="indefinite" path={p.center} />
              </circle>
              <circle r="1.5" fill={p.color} opacity="0.3">
                <animateMotion dur="2.5s" repeatCount="indefinite" begin="1s" path={p.center} />
              </circle>
            </g>
          ))}

          {/* Center → Buyback band */}
          {flowPaths.outflow && (
            <g>
              <path d={flowPaths.outflow.band} fill="url(#flow-out)" />
              <circle r="3" fill="var(--green)" opacity="0.5">
                <animateMotion dur="2s" repeatCount="indefinite" path={flowPaths.outflow.center} />
              </circle>
            </g>
          )}

          {/* Buyback → Backing vertical connector */}
          {flowPaths.verticalConnector && (
            <g>
              <line
                x1={flowPaths.verticalConnector.x}
                y1={flowPaths.verticalConnector.y1}
                x2={flowPaths.verticalConnector.x}
                y2={flowPaths.verticalConnector.y2}
                stroke="var(--green)"
                strokeWidth="1"
                strokeDasharray="4 3"
                opacity={0.3}
              />
              <circle r="2" fill="var(--green)" opacity="0.5">
                <animateMotion
                  dur="1s"
                  repeatCount="indefinite"
                  path={`M ${flowPaths.verticalConnector.x} ${flowPaths.verticalConnector.y1} L ${flowPaths.verticalConnector.x} ${flowPaths.verticalConnector.y2}`}
                />
              </circle>
            </g>
          )}
        </svg>

        {/* HTML node layout */}
        <div className="flex items-stretch gap-0">
          {/* Left: Source nodes */}
          <div className="flex w-[28%] shrink-0 flex-col justify-center gap-1.5">
            {sortedSources.map((s, i) => (
              // biome-ignore lint/a11y/noStaticElementInteractions: hover-only visualization indicator, not a clickable element
              <div
                key={s.name}
                ref={(el) => {
                  sourceRefs.current[i] = el;
                }}
                className="rounded-xl border px-3 py-2 text-right transition-opacity"
                style={{
                  borderColor: `color-mix(in oklch, ${s.color} 20%, transparent)`,
                  backgroundColor: `color-mix(in oklch, ${s.color} 5%, transparent)`,
                  opacity: hoveredIndex === null || hoveredIndex === i ? 1 : 0.4,
                  transition: "opacity 150ms",
                }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <p className="text-[10px] font-medium uppercase tracking-widest text-tertiary-t">
                  {s.name}
                </p>
                <p className="tabular-nums text-sm font-semibold">
                  {formatUsd(s.value, true)}
                  <span className="ml-1 text-xs font-normal text-tertiary-t">/wk</span>
                </p>
                <p className="tabular-nums text-[10px] text-tertiary-t">
                  {s.percentage.toFixed(0)}% of revenue
                </p>
              </div>
            ))}
          </div>

          {/* Center: Total revenue */}
          <div className="flex flex-1 items-center justify-center px-6">
            <div
              ref={centerRef}
              className="w-full rounded-2xl border border-yellow/15 bg-yellow/[0.06] px-4 py-6 text-center"
            >
              <div className="mb-1 flex items-center justify-center gap-1.5">
                <div className="size-1.5 rounded-full bg-yellow" />
                <p className="text-[10px] font-medium uppercase tracking-widest text-tertiary-t">
                  Weekly Revenue
                </p>
              </div>
              <p className="tabular-nums text-2xl font-bold tracking-tight">
                {formatUsd(totalRevenue, true)}
              </p>
              <p className="mt-0.5 text-xs text-secondary-t">
                {sortedSources.length} revenue sources
              </p>
            </div>
          </div>

          {/* Right: Output nodes */}
          <div className="flex w-[28%] shrink-0 flex-col justify-center gap-3">
            <div
              ref={buybackRef}
              className="rounded-2xl border border-green/15 bg-green/[0.06] px-4 py-4 text-center"
            >
              <div className="mb-1 flex items-center justify-center gap-1.5">
                <div className="size-1.5 rounded-full bg-green" />
                <p className="text-[10px] font-medium uppercase tracking-widest text-tertiary-t">
                  Buyback & Burn
                </p>
              </div>
              <p className="tabular-nums text-xl font-bold tracking-tight">
                {weeklyBurnsFormatted} OHM
              </p>
              <p className="mt-0.5 text-xs text-secondary-t">
                {formatUsd(totalRevenue, true)} weekly spend
              </p>
            </div>

            <div
              ref={backingRef}
              className="rounded-2xl border border-green/15 bg-green/[0.06] px-4 py-3 text-center ring-1 ring-green/20"
            >
              <div className="mb-1 flex items-center justify-center gap-1.5">
                <div className="size-1.5 rounded-full bg-green" />
                <p className="text-[10px] font-medium uppercase tracking-widest text-tertiary-t">
                  Backing Per OHM
                </p>
              </div>
              <p className="tabular-nums text-xl font-bold tracking-tight text-green">
                {backingValue}
              </p>
              <p className="mt-0.5 text-xs text-secondary-t">{deflationRate}% annual deflation</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: Vertical flow */}
      <div className="space-y-4 md:hidden">
        {/* Stacked revenue bar */}
        <div>
          <p className="mb-2 text-center text-[10px] font-medium uppercase tracking-widest text-tertiary-t">
            Revenue Sources
          </p>
          <div className="flex overflow-hidden rounded-lg" style={{ height: 28 }}>
            {sortedSources.map((s) => (
              <div
                key={s.name}
                style={{
                  width: `${Math.max(s.percentage, 2)}%`,
                  backgroundColor: s.color,
                  opacity: 0.5,
                }}
                title={`${s.name}: ${formatUsd(s.value)}/wk`}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
            {sortedSources.map((s) => (
              <div key={s.name} className="flex items-center gap-1 text-[10px] text-secondary-t">
                <div className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span>{s.name}</span>
                <span className="tabular-nums text-tertiary-t">{s.percentage.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Arrow down */}
        <div className="flex justify-center">
          <svg
            role="img"
            aria-label="Arrow down"
            width="24"
            height="32"
            viewBox="0 0 24 32"
            fill="none"
          >
            <line
              x1="12"
              y1="0"
              x2="12"
              y2="24"
              stroke="var(--border-a20)"
              strokeWidth="1"
              strokeDasharray="4 3"
            />
            <path d="M12 24 L8 18 L16 18 Z" fill="var(--border-a20)" />
            <circle r="2.5" fill="var(--green)" opacity="0.7">
              <animateMotion dur="1.5s" repeatCount="indefinite" path="M12,0 L12,24" />
            </circle>
          </svg>
        </div>

        {/* Total revenue */}
        <div className="rounded-2xl border border-yellow/15 bg-yellow/[0.06] px-4 py-4 text-center">
          <p className="text-[10px] font-medium uppercase tracking-widest text-tertiary-t">
            Weekly Revenue
          </p>
          <p className="mt-1 tabular-nums text-2xl font-bold">{formatUsd(totalRevenue, true)}</p>
        </div>

        {/* Arrow down */}
        <div className="flex justify-center">
          <svg
            width="24"
            height="32"
            viewBox="0 0 24 32"
            fill="none"
            role="img"
            aria-label="Arrow down"
          >
            <line
              x1="12"
              y1="0"
              x2="12"
              y2="24"
              stroke="var(--border-a20)"
              strokeWidth="1"
              strokeDasharray="4 3"
            />
            <path d="M12 24 L8 18 L16 18 Z" fill="var(--border-a20)" />
            <circle r="2.5" fill="var(--green)" opacity="0.7">
              <animateMotion dur="1.5s" repeatCount="indefinite" path="M12,0 L12,24" />
            </circle>
          </svg>
        </div>

        {/* Buyback */}
        <div className="rounded-2xl border border-green/15 bg-green/[0.06] px-3 py-3 text-center">
          <p className="text-[10px] font-medium uppercase tracking-widest text-tertiary-t">
            Buyback & Burn
          </p>
          <p className="mt-1 tabular-nums text-lg font-bold">{weeklyBurnsFormatted} OHM</p>
        </div>

        {/* Arrow down */}
        <div className="flex justify-center">
          <svg
            width="24"
            role="img"
            aria-label="Arrow down"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
          >
            <line
              x1="12"
              y1="0"
              x2="12"
              y2="18"
              stroke="var(--green)"
              strokeWidth="1"
              strokeDasharray="4 3"
              opacity={0.4}
            />
            <path d="M12 18 L8 12 L16 12 Z" fill="var(--green)" opacity={0.4} />
            <circle r="2" fill="var(--green)" opacity="0.5">
              <animateMotion dur="1s" repeatCount="indefinite" path="M12,0 L12,18" />
            </circle>
          </svg>
        </div>

        {/* Backing */}
        <div className="rounded-2xl border border-green/15 bg-green/[0.06] px-3 py-3 text-center ring-1 ring-green/20">
          <p className="text-[10px] font-medium uppercase tracking-widest text-tertiary-t">
            Backing Per OHM
          </p>
          <p className="mt-1 tabular-nums text-lg font-bold text-green">{backingValue}</p>
          <p className="text-[10px] text-tertiary-t">{deflationRate}% deflation/yr</p>
        </div>
      </div>
    </>
  );
}
