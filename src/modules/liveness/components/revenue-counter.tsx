import { Card } from "@/components/ui/card";
import { NumberFlow } from "@/components/ui/number-flow";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useRevenueCounter } from "@/lib/hooks/liveness/useRevenueCounter";
import { formatUsd } from "@/lib/liveness/formatters";

export function RevenueCounter() {
  const { displayValue, timeWindow, setTimeWindow, weeklyTotal, isLoading } = useRevenueCounter();

  if (isLoading) {
    return (
      <Card className="p-8">
        <Skeleton className="mb-4 h-4 w-40" />
        <Skeleton className="mb-6 h-14 w-72" />
        <Skeleton className="h-9 w-64" />
      </Card>
    );
  }

  const timeWindowLabel = {
    daily: "earned today",
    weekly: "earned this week",
    annualized: "projected annually",
  }[timeWindow];

  const perSecond = weeklyTotal / (7 * 24 * 60 * 60);

  return (
    <Card className="p-8">
      <div className="mb-1 flex items-center gap-2">
        <div className="relative flex items-center justify-center">
          <div className="size-2 rounded-full bg-green" />
          <div className="absolute size-2 rounded-full bg-green/40 animate-heartbeat-ring" />
          <div className="absolute size-2 rounded-full bg-green/20 animate-heartbeat-ring-delayed" />
        </div>
        <p className="text-xs font-medium uppercase tracking-widest">Protocol Revenue</p>
      </div>

      <div className="mb-2">
        <NumberFlow
          value={displayValue}
          format={{
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            notation: "standard",
          }}
          className="tabular-nums text-5xl font-bold tracking-tight"
        />
      </div>

      <div className="mb-6 flex items-center gap-3">
        <p className="text-sm text-secondary-t">{timeWindowLabel}</p>
        {timeWindow !== "annualized" && (
          <span className="text-xs text-tertiary-t tabular-nums">
            +{formatUsd(perSecond, false)}/s
          </span>
        )}
      </div>

      <Tabs
        value={timeWindow}
        onValueChange={(v) => setTimeWindow(v as "daily" | "weekly" | "annualized")}
      >
        <TabsList>
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="annualized">Annual</TabsTrigger>
        </TabsList>
      </Tabs>
    </Card>
  );
}
