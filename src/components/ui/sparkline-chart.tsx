import { useId } from "react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { format, parseISO } from "date-fns";
import type { Format } from "@number-flow/react";
import { cn } from "@/lib/utils";
import { NumberFlow } from "@/components/ui/number-flow";

interface SparklineChartProps {
  data: object[];
  dataKey: string;
  isPositive: boolean;
  className?: string;
  valueLabel?: string;
  valueFormat?: Format;
}

const DEFAULT_VALUE_FORMAT: Format = {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

interface TooltipEntry {
  dataKey?: string;
  value?: number;
  color?: string;
}

function SparkTooltip({
  active,
  payload,
  label,
  valueLabel,
  valueFormat,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
  valueLabel?: string;
  valueFormat: Format;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const value = entry?.value ?? 0;
  const color = entry?.color;

  let dateStr = "";
  if (typeof label === "string" && label) {
    try {
      dateStr = format(parseISO(label), "MMMM d, yyyy, HH:mm 'UTC'");
    } catch {
      dateStr = label;
    }
  }

  return (
    <div className="bg-surface-tooltip shadow-tooltip flex flex-col gap-1.5 rounded-[20px] px-3 py-2">
      {dateStr && (
        <p className="text-secondary-t text-center text-xs/4 font-semibold whitespace-nowrap">
          {dateStr}
        </p>
      )}
      <div className="flex w-full items-center justify-between gap-4">
        <div className="flex items-center gap-1.5">
          {color && (
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          )}
          {valueLabel && (
            <span className="text-secondary-t text-xs/4 font-normal whitespace-nowrap">
              {valueLabel}
            </span>
          )}
        </div>
        <NumberFlow
          value={value}
          format={valueFormat}
          className="text-primary-t text-xs/4 font-semibold whitespace-nowrap"
        />
      </div>
    </div>
  );
}

export function SparklineChart({
  data,
  dataKey,
  isPositive,
  className,
  valueLabel,
  valueFormat = DEFAULT_VALUE_FORMAT,
}: SparklineChartProps) {
  const id = useId();
  const gradientId = `spark-grad-${id}`;

  if (data.length <= 1) return null;

  const color = isPositive ? "var(--green)" : "var(--red)";

  return (
    <div
      className={cn(
        "w-55 h-14 max-xs:w-full max-xs:h-10 shrink-0 [&_*:focus]:outline-none [&_*]:outline-none",
        className,
      )}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <YAxis domain={["dataMin", "dataMax"]} hide />
          <Tooltip
            cursor={{ stroke: "var(--border-a20)", strokeWidth: 1 }}
            content={<SparkTooltip valueLabel={valueLabel} valueFormat={valueFormat} />}
            wrapperStyle={{ outline: "none" }}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 3, stroke: color, strokeWidth: 1, fill: color }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
