import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/tabs.tsx";
import { NumberFlow } from "@/components/ui/number-flow";
import { useRevenueCounter } from "@/modules/pulse/hooks/useRevenueCounter.ts";
import marbleBgLight from "@/assets/bgProtocolLight.png";
import marbleBgDark from "@/assets/bgProtocolDark.png";
import { useTheme } from "@/components/theme-provider.tsx";
import { PulseDot } from "@/components/pulse-dot.tsx";

type TimeWindow = "daily" | "weekly" | "annualized";

const TIME_WINDOWS: { value: TimeWindow; label: string }[] = [
  { value: "daily", label: "24h" },
  { value: "weekly", label: "7d" },
  { value: "annualized", label: "1y" },
];

export function OverviewProtocolRevenue() {
  const { displayValue, timeWindow, setTimeWindow, weeklyTotal } = useRevenueCounter();
  const perSecond = weeklyTotal / (7 * 24 * 60 * 60);
  const { theme } = useTheme();
  return (
    <Card
      className="relative flex flex-col justify-between overflow-hidden p-4 min-h-70"
      style={{
        backgroundImage: `url(${theme === "light" ? marbleBgLight : marbleBgDark})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Header */}
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PulseDot variant="green" />
          <p className="text-sm font-semibold">Protocol Revenue</p>
        </div>

        {/* Period tabs */}
        <Segmented
          defaultValue="weekly"
          options={TIME_WINDOWS}
          size="sm"
          onValueChange={setTimeWindow}
        />
      </div>

      {/* Main value */}
      <div className="relative flex flex-col items-center justify-center flex-1 gap-2 py-6">
        <NumberFlow
          value={displayValue}
          format={{
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            notation: "standard",
          }}
          className="tabular-nums text-[clamp(2.5rem,5vw,4rem)] font-bold tracking-tight text-primary-t"
        />
        {timeWindow !== "annualized" && (
          <NumberFlow
            prefix="+"
            suffix="/s"
            value={perSecond}
            className="text-[30px] font-medium tabular-nums text-brand-sand-1000"
          />
        )}
      </div>
    </Card>
  );
}
