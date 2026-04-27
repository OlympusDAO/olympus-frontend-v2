import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator.tsx";
import { TooltipInfo } from "@/components/ui/tooltip";
import { useYrfHistory } from "@/modules/pulse/hooks/useYrfHistory";
import { useTreasuryMetrics } from "@/modules/pulse/hooks/useTreasuryMetrics.ts";
import { useOhmPrice } from "@/lib/hooks/liveness/useOhmPrice";
import { formatNumber } from "@/lib/liveness/formatters";
import { PulseDot } from "@/components/pulse-dot.tsx";
import { Icon } from "@/components/icon.tsx";
import { NumberFlow } from "@/components/ui/number-flow.tsx";

export function OverviewYrf() {
  const { data: yrfHistory } = useYrfHistory();
  const { data: treasury } = useTreasuryMetrics();
  const { data: price } = useOhmPrice();

  const totalOhmBurned = yrfHistory?.totalOhmBurned ?? 0;
  const totalYieldDeployed = yrfHistory?.totalYieldDeployed ?? 0;
  const ohmPrice = price?.price ?? 0;
  const weeklyYield = yrfHistory?.currentWeeklyYield ?? 0;
  const weeklyBurns = ohmPrice > 0 ? weeklyYield / ohmPrice : 0;
  const annualBurns = weeklyBurns * 52;
  const supplyDeflationRate =
    treasury?.ohmTotalSupply && treasury.ohmTotalSupply > 0
      ? (annualBurns / treasury.ohmTotalSupply) * -100
      : 0;

  const isActive = totalYieldDeployed > 0;

  return (
    <Card className="p-5 flex flex-col">
      {/* Header */}
      <div className=" flex items-center justify-between">
        <TooltipInfo title="The Yield Repurchase Facility converts protocol revenue into OHM buybacks, creating continuous buy pressure.">
          <p className="text-sm/5 font-semibold text-primary-t">Yield Repurchase Facility</p>
        </TooltipInfo>
        <div className="flex items-center gap-2">
          <span className="text-xs/4 text-secondary-t font-normal">
            {isActive ? "Active" : "Inactive"}
          </span>
          <PulseDot variant={isActive ? "green" : "yellow"} />
        </div>
      </div>
      <Separator className="w-full my-4" />
      {/* Body */}
      <div>
        <TooltipInfo title="Total OHM repurchased via YRF bond markets since inception.">
          <p className="text-sm/5 text-secondary-t font-normal">Lifetime OHM Repurchased</p>
        </TooltipInfo>
        <div className="flex items-center gap-x-2 mt-1">
          <Icon className="size-7" name="OHMTokenIcon" />
          <NumberFlow
            value={totalOhmBurned}
            format={{ style: "decimal", notation: "standard" }}
            className="text-[32px]/[40px] font-semibold [--number-flow-char-height:1.25em]"
          />
        </div>
      </div>

      {/* Annual Supply Impact row */}
      <div className="mt-auto pt-4">
        <TooltipInfo
          title={`At the current YRF buyback rate, annualized supply change is ${formatNumber(Math.round(annualBurns))} OHM/yr.`}
        >
          <p className="text-xs/4 text-secondary-t font-normal">Annual Supply Impact</p>
        </TooltipInfo>
        <div className="flex items-center gap-x-1 mt-1">
          <NumberFlow
            value={supplyDeflationRate / 100}
            format={{ style: "percent", notation: "standard" }}
            className="text-sm/5 font-semibold [--number-flow-char-height:1.4286em]"
          />
          <NumberFlow
            suffix="OHM/yr"
            value={annualBurns}
            format={{
              style: "decimal",
              notation: window.innerWidth <= 639 ? "compact" : "standard",
            }}
            className="text-sm/5 text-secondary-t font-normal [--number-flow-char-height:1.4286em]"
          />
        </div>
      </div>
    </Card>
  );
}
