import { Card } from "@/components/ui/card";
import { TooltipInfo } from "@/components/ui/tooltip";
import { useEmissionManager } from "@/modules/pulse/hooks/useEmissionManager";
import { useOhmPrice } from "@/lib/hooks/liveness/useOhmPrice";
import { CircleProgress } from "@/components/ui/progress.tsx";
import { PulseDot } from "@/components/pulse-dot.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { NumberFlow } from "@/components/ui/number-flow.tsx";

export function OverviewEmissionManager() {
  const { data: em } = useEmissionManager();
  const { data: price } = useOhmPrice();

  const state = em?.state;
  const ohmPrice = price?.price ?? 0;

  const statusLabel = state?.isEnabled ? "Emitting" : state?.isActive ? "Idle" : "Inactive";
  const statusColor = state?.isEnabled ? "green" : state?.isActive ? "yellow" : "disabled";

  const backing = state?.backing ?? 0;
  const minimumPremium = state?.minimumPremium ?? 0;
  const currentPremium = backing > 0 ? ((ohmPrice - backing) / backing) * 100 : 0;
  const thresholdPct = minimumPremium * 100;
  const premiumProgress = thresholdPct > 0 ? (currentPremium / thresholdPct) * 100 : 0;
  const emissionTriggerPrice = backing * (1 + minimumPremium);

  return (
    <Card className="p-5">
      {/* Header */}
      <div className=" flex items-center justify-between">
        <TooltipInfo title="The Emission Manager controls OHM supply expansion when price premium over backing exceeds the minimum threshold.">
          <p className=" text-[15px]/[20px] font-semibold text-primary-t"> Emission Manager </p>
        </TooltipInfo>
        <div className="flex items-center gap-2 mt-1">
          <PulseDot variant={statusColor} />
          <span className="text-xs text-secondary-t">{statusLabel}</span>
        </div>
      </div>
      <Separator className="w-full my-4" />
      {/* Body */}
      <div className="flex items-end justify-between gap-4">
        {/* Left: Premium to Threshold */}
        <div>
          <TooltipInfo
            title={`Emissions activate when OHM premium over EM backing ($${backing.toFixed(2)}) exceeds ${thresholdPct.toFixed(0)}%.`}
          >
            Premium to Threshold
          </TooltipInfo>
          <div className="flex items-center gap-2 mt-0.5">
            <CircleProgress size={28} value={premiumProgress} />
            <NumberFlow
              value={currentPremium / 100}
              format={{ style: "percent", notation: "standard" }}
              className="text-[32px]/[32px] font-semibold"
            />
          </div>
        </div>

        {/* Right: Trigger Price */}
        <div className="text-right">
          <p className="mb-0.5 text-xs text-secondary-t">Trigger Price</p>
          <NumberFlow
            suffix="/OHM"
            value={emissionTriggerPrice}
            className="text-[15px]/[20px] font-semibold"
          />
        </div>
      </div>
    </Card>
  );
}
