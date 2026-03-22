import { Card } from "@/components/ui/card";
import { ProtocolDataSource } from "./protocol-data-source";
import { CircleProgress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { TooltipInfo } from "@/components/ui/tooltip";
import { useEmissionManager } from "@/lib/hooks/liveness/useEmissionManager";
import { useOhmPrice } from "@/lib/hooks/liveness/useOhmPrice";
import { formatUsd } from "@/lib/liveness/formatters";
import { PulseDot } from "@/components/pulse-dot.tsx";
import { NumberFlow } from "@/components/ui/number-flow.tsx";

export function ProtocolEmissionManager() {
  const { data: em, isLoading } = useEmissionManager();
  const { data: price } = useOhmPrice();

  if (isLoading || !em) {
    return (
      <Card className="p-6">
        <Skeleton className="mb-4 h-4 w-48" />
        <div className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </Card>
    );
  }

  const { state } = em;

  const statusLabel = state.isEnabled ? "Emitting" : state.isActive ? "Idle" : "Inactive";
  const statusDot = state.isEnabled ? "green" : state.isActive ? "yellow" : "red";

  const ohmPrice = price?.price ?? 0;
  const currentPremium = state.backing > 0 ? ((ohmPrice - state.backing) / state.backing) * 100 : 0;

  const thresholdPct = state.minimumPremium * 100;
  const premiumProgress = thresholdPct > 0 ? Math.max(0, (currentPremium / thresholdPct) * 100) : 0;
  const premiumExceedsThreshold = currentPremium >= thresholdPct;

  const emissionTriggerPrice = state.backing * (1 + state.minimumPremium);

  return (
    <Card className="p-5 flex flex-col">
      <div className=" flex items-center justify-between">
        <TooltipInfo title="The Emission Manager controls OHM supply expansion when price premium over backing exceeds the minimum threshold.">
          <p className="text-[15px]/[20px] font-semibold text-primary-t"> Emission Manager</p>
        </TooltipInfo>
        <div className="flex items-center gap-2">
          <PulseDot variant={statusDot} />
          <span className="text-xs text-secondary-t">{statusLabel}</span>
        </div>
      </div>
      <Separator className="my-4" />

      {/* Premium Gauge — hero element */}
      <div className="">
        <TooltipInfo
          title={`Emissions activate when OHM premium over EM backing ($${state.backing.toFixed(2)}) exceeds ${thresholdPct.toFixed(0)}%. Current premium: ${currentPremium.toFixed(1)}%. OHM needs to reach ${formatUsd(emissionTriggerPrice)} to trigger.`}
          className="text-[15px]/[20px] text-secondary-t"
        >
          Premium to Threshold
        </TooltipInfo>
        <div className="mt-2 flex items-center ">
          <div className="flex items-center gap-x-2 min-w-55.5">
            <CircleProgress
              value={Math.min(premiumProgress, 100)}
              size={28}
              strokeWidth={4}
              type={premiumExceedsThreshold ? "success" : "warning"}
            />
            <NumberFlow
              className="text-[32px]/[40px] font-semibold"
              format={{ style: "percent" }}
              value={currentPremium / 100}
            />
          </div>
          <div className="text-right">
            <p className="text-xs text-secondary-t">Trigger Price</p>
            <NumberFlow
              className="tabular-nums text-[15px]/[20px] font-semibold"
              value={emissionTriggerPrice}
              suffix="/OHM"
            />
          </div>
        </div>
      </div>

      <Separator className="my-4" />

      <div className="flex items-center">
        <div className="min-w-55.5">
          <TooltipInfo
            title="The base rate of OHM supply expansion per beat when emissions are active."
            className="text-xs text-tertiary-t"
          >
            Base Rate
          </TooltipInfo>
          <NumberFlow
            className="tabular-nums text-[15px]/[20px] font-semibold"
            value={state.baseEmissionRate}
            format={{ style: "percent" }}
          />
        </div>
        <div>
          <TooltipInfo
            title="Backing price used by the Emission Manager to calculate premium. Updated periodically."
            className="text-xs text-tertiary-t"
          >
            EM Backing
          </TooltipInfo>
          <NumberFlow
            className="tabular-nums text-[15px]/[20px] font-semibold"
            value={state.backing}
          />
        </div>
      </div>

      {em.recentBackingUpdates.length > 0 && (
        <>
          <Separator className="my-4" />
          <div className="mb-3">
            <TooltipInfo
              title={`Last ${em.recentBackingUpdates.length} emission beats showing OHM supply added and reserves collected per beat.`}
              className="text-xs font-medium uppercase tracking-widest text-secondary-t"
            >
              Last {em.recentBackingUpdates.length} Emission Beats
            </TooltipInfo>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-tertiary-t">Supply Emitted</p>
              <NumberFlow
                className="tabular-nums text-[15px]/[20px] font-semibold"
                format={{ style: "decimal", notation: "standard" }}
                value={Math.round(em.totalSupplyEmitted)}
                prefix="+"
                suffix="OHM"
              />
            </div>
            <div>
              <p className="text-xs text-tertiary-t">Reserves Added</p>
              <NumberFlow
                className="tabular-nums text-[15px]/[20px] font-semibold"
                value={Math.round(em.totalReservesAdded)}
                prefix="+"
              />
            </div>
          </div>
        </>
      )}
      <ProtocolDataSource sources={["Emission Manager Subgraph", "Treasury API"]} />
    </Card>
  );
}
