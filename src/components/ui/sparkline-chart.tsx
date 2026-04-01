import { useId } from "react";
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts";
import { cn } from "@/lib/utils";

interface SparklineChartProps {
  data: object[];
  dataKey: string;
  isPositive: boolean;
  height?: number;
  className?: string;
}

export function SparklineChart({
  data,
  dataKey,
  isPositive,
  height = 56,
  className,
}: SparklineChartProps) {
  const id = useId();
  const gradientId = `spark-grad-${id}`;

  if (data.length <= 1) return null;

  const color = isPositive ? "var(--green)" : "var(--red)";

  return (
    <div className={cn("w-55 shrink-0", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <YAxis domain={["dataMin", "dataMax"]} hide />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
