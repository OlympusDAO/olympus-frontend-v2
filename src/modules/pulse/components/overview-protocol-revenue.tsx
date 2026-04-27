import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/tabs.tsx";
import { NumberFlow } from "@/components/ui/number-flow";
import { useRevenueCounter, type TimeWindow } from "@/modules/pulse/hooks/useRevenueCounter.ts";
import marbleBgLight from "@/assets/bgProtocolLight.webp";
import marbleBgDark from "@/assets/bgProtocolDark.webp";
import goldenTexture from "@/assets/golden-texture.webp";
import { useTheme } from "@/components/theme-provider.tsx";
import { PulseDot } from "@/components/pulse-dot.tsx";

const TIME_WINDOWS: { value: TimeWindow; label: string }[] = [
  { value: "daily", label: "24h" },
  { value: "weekly", label: "7d" },
  { value: "annualized", label: "1y" },
];

const perSecondFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2,
});

interface OverviewProtocolRevenueProps {
  timeWindow: TimeWindow;
  setTimeWindow: (v: TimeWindow) => void;
}

export function OverviewProtocolRevenue({
  timeWindow,
  setTimeWindow,
}: OverviewProtocolRevenueProps) {
  const { displayValue, weeklyTotal } = useRevenueCounter({ timeWindow, setTimeWindow });
  const perSecond = weeklyTotal / (7 * 24 * 60 * 60);
  const perSecondLabel = `+${perSecondFormat.format(perSecond)} /s`;
  const { resolvedTheme } = useTheme();
  return (
    <Card
      className="relative flex flex-col justify-between overflow-hidden p-4 pl-5 pb-5 min-h-70"
      style={{
        backgroundImage: `url(${resolvedTheme === "light" ? marbleBgLight : marbleBgDark})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Header */}
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm/5 font-semibold">Protocol Revenue</p>
          <PulseDot variant="green" />
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
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
            notation: "standard",
          }}
          className="tabular-nums text-[clamp(2.5rem,5vw,4rem)] leading-none font-semibold tracking-tight text-primary-t"
        />
        {timeWindow !== "annualized" && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="240"
            height="32"
            viewBox="0 8 240 32"
            className="block overflow-visible"
            role="img"
            aria-label={perSecondLabel}
          >
            <defs>
              <pattern
                id="revenue-gold-pattern"
                patternUnits="userSpaceOnUse"
                x="0"
                y="0"
                width="218"
                height="116"
              >
                <image
                  href={goldenTexture}
                  x="0"
                  y="0"
                  width="218"
                  height="116"
                  preserveAspectRatio="xMidYMid slice"
                />
              </pattern>
              {/* Two-sided inner shadow: SVG has no native inner-shadow primitive, so we
                  subtract SourceAlpha from an offset+blurred copy of itself (k2=-1, k3=1)
                  to carve an inward-only silhouette, then flood-fill it. */}
              <filter id="revenue-gold-inner-shadow" x="-5%" y="-25%" width="110%" height="150%">
                <feOffset in="SourceAlpha" dx="0.5" dy="0.5" result="darkOffset" />
                <feGaussianBlur in="darkOffset" stdDeviation="0.25" result="darkBlur" />
                <feComposite
                  in="darkBlur"
                  in2="SourceAlpha"
                  operator="arithmetic"
                  k2="-1"
                  k3="1"
                  result="darkHollow"
                />
                <feFlood floodColor="#000000" floodOpacity="0.25" result="darkFlood" />
                <feComposite in="darkFlood" in2="darkHollow" operator="in" result="darkShadow" />

                <feOffset in="SourceAlpha" dx="-0.5" dy="-0.5" result="lightOffset" />
                <feGaussianBlur in="lightOffset" stdDeviation="0.25" result="lightBlur" />
                <feComposite
                  in="lightBlur"
                  in2="SourceAlpha"
                  operator="arithmetic"
                  k2="-1"
                  k3="1"
                  result="lightHollow"
                />
                <feFlood floodColor="#FFFFFF" floodOpacity="0.4" result="lightFlood" />
                <feComposite in="lightFlood" in2="lightHollow" operator="in" result="lightShadow" />

                <feMerge>
                  <feMergeNode in="SourceGraphic" />
                  <feMergeNode in="darkShadow" />
                  <feMergeNode in="lightShadow" />
                </feMerge>
              </filter>
            </defs>
            <text
              x="120"
              y="30"
              textAnchor="middle"
              fontFamily="inherit"
              fontSize="30"
              fontWeight="600"
              fill="url(#revenue-gold-pattern)"
              filter="url(#revenue-gold-inner-shadow)"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {perSecondLabel}
            </text>
          </svg>
        )}
      </div>
    </Card>
  );
}
