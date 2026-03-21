import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator.tsx";
import { TooltipInfo } from "@/components/ui/tooltip";
import { useYrfHistory } from "@/lib/hooks/liveness/useYrfHistory";
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
    <Card className="p-5">
      {/* Header */}
      <div className=" flex items-center justify-between">
        <TooltipInfo title="The Yield Repurchase Facility converts protocol revenue into OHM buybacks, creating continuous buy pressure.">
          <p className=" text-[15px]/[20px] font-semibold text-primary-t">
            {" "}
            Yield Repurchase Facility{" "}
          </p>
        </TooltipInfo>
        <div className="flex items-center gap-2 mt-1">
          <PulseDot variant={isActive ? "green" : "yellow"} />
          <span className="text-xs text-secondary-t">{isActive ? "Active" : "Inactive"}</span>
        </div>
      </div>
      <Separator className="w-full my-4" />
      {/* Body */}
      <div className="flex items-end justify-between gap-4">
        {/* Left: Lifetime OHM Repurchased */}
        <div>
          <TooltipInfo
            title="Total OHM repurchased via YRF bond markets since inception."
            className=" text-xs text-secondary-t"
          >
            Lifetime OHM Repurchased
          </TooltipInfo>
          <div className="flex items-center gap-x-2 mt-1">
            <Icon className="size-7" name="OHMColorTokenIcon" />
            <NumberFlow
              value={totalOhmBurned}
              format={{ style: "decimal", notation: "standard" }}
              className="text-[32px]/[32px] font-semibold"
            />
          </div>
        </div>

        {/* Right: Annual Supply Impact */}
        <div className="text-right">
          <div className="flex justify-end">
            <TooltipInfo
              title={`At the current YRF buyback rate, annualized supply change is ${formatNumber(Math.round(annualBurns))} OHM/yr.`}
            >
              <p className="text-xs text-secondary-t">Annual Supply Impact</p>
            </TooltipInfo>
          </div>
          <div className="flex items-center gap-x-1">
            <NumberFlow
              value={supplyDeflationRate / 100}
              format={{ style: "percent", notation: "standard" }}
              className="text-[15px]/[20px] font-semibold"
            />
            <NumberFlow
              suffix="OHM/yr"
              value={annualBurns}
              format={{ style: "decimal", notation: "standard" }}
              className="text-[15px]/[20px] text-secondary-t"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
