import type * as React from "react";
import { useMemo } from "react";
import { Progress as ProgressPrimitive } from "@base-ui/react/progress";

import { cn } from "@/lib/utils";

function Progress({
  className,
  value,
  indicatorColor,
  indicatorClassName,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  indicatorColor?: string;
  indicatorClassName?: string;
}) {
  const clampedValue = Math.min(value ?? 0, 100);
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={value ?? null}
      className={cn("bg-primary/20 relative h-2 w-full overflow-hidden rounded-full", className)}
      {...props}
    >
      <ProgressPrimitive.Track className="h-full w-full">
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className={cn("h-full w-full flex-1 transition-all", indicatorClassName)}
          style={{
            transform: `translateX(-${100 - clampedValue}%)`,
            ...(!indicatorClassName ? { backgroundColor: indicatorColor ?? "var(--yellow)" } : {}),
          }}
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  );
}

interface ICircleProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  size: number;
  strokeWidth?: number;
  type?: "success" | "error" | "warning";
}

const CircleProgress = (props: ICircleProgressProps) => {
  const { value, size, strokeWidth = 3, className, style, type = "success", ...rest } = props;

  const radius = useMemo(() => (size - strokeWidth) / 2, [size, strokeWidth]);
  const center = useMemo(() => size / 2, [size]);

  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div
      data-slot="progress"
      className={cn("relative flex items-center justify-center", className)}
      style={{ width: size, height: size, ...style }}
      {...rest}
    >
      <svg width={size} height={size} fill="none" aria-hidden="true">
        {/* Background circle */}
        <circle
          stroke="currentColor"
          className="stroke-surface-a10"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={center}
          cy={center}
        />
        {/* Progress circle */}
        <circle
          data-slot="progress-indicator"
          stroke="currentColor"
          className={cn({
            "stroke-green": type === "success",
            "stroke-red": type === "error",
            "stroke-orange": type === "warning",
          })}
          strokeWidth={strokeWidth}
          fill="none"
          r={radius}
          cx={center}
          cy={center}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            transform: "rotate(-90deg)",
            transformOrigin: "center",
          }}
        />
      </svg>
    </div>
  );
};

export { Progress, CircleProgress };
