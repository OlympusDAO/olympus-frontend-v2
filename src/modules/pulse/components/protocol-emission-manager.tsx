import { Card } from "@/components/ui/card";
import { calcOhmPremiumPct } from "@/modules/pulse/utils/ohm-metrics";
import { ProtocolDataSource } from "./protocol-data-source";
import { CircleProgress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { TooltipInfo } from "@/components/ui/tooltip";
import { useEmissionManager } from "@/modules/pulse/hooks/useEmissionManager";
import { useOhmPrice } from "@/lib/hooks/liveness/useOhmPrice";
import { formatUsd } from "@/lib/liveness/formatters";
import { PulseDot } from "@/components/pulse-dot.tsx";
import { NumberFlow } from "@/components/ui/number-flow.tsx";
import { ColorModeImage } from "@/components/color-mode-wrapper.tsx";
import iconDark from "@/assets/protocol-2-l.webp";
import iconLight from "@/assets/protocol-2-b.webp";

export function ProtocolEmissionManager() {
  const { data: em, isLoading } = useEmissionManager();
  const { data: price } = useOhmPrice();

  if (isLoading || !em) {
    return (
      <Card className="p-5">
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
  const currentPremium = calcOhmPremiumPct(ohmPrice, state.backing);

  const thresholdPct = state.minimumPremium * 100;
  const premiumProgress = thresholdPct > 0 ? Math.max(0, (currentPremium / thresholdPct) * 100) : 0;
  const premiumExceedsThreshold = currentPremium >= thresholdPct;

  const emissionTriggerPrice = state.triggerPrice;

  return (
    <Card className="p-5 flex flex-col">
      <div className="flex items-center justify-between">
        <TooltipInfo title="The Emission Manager controls OHM supply expansion when price premium over backing exceeds the minimum threshold.">
          <p className="text-sm font-semibold text-primary-t">Emission Manager</p>
        </TooltipInfo>
        <div className="flex items-center gap-2">
          <span className="text-xs text-secondary-t">{statusLabel}</span>
          <PulseDot variant={statusDot} />
        </div>
      </div>
      <div className="flex items-center gap-4 mt-4">
        <ColorModeImage
          srcDark={iconDark}
          srcLight={iconLight}
          alt="Emission manager"
          className="min-w-18 h-18"
        />
        <div>
          <p className="text-sm font-semibold mb-1">
            Supply only expands when the market demands it
          </p>
          <p className="text-secondary-t text-xs font-normal">
            The Emission Manager monitors OHM's premium to backing. Above threshold, it enables
            controlled supply growth via CDs. Below it, YRF buybacks dominate and supply contracts.
          </p>
        </div>
      </div>
      <Separator className="my-4" />

      {/* Premium Gauge — hero element */}
      <div className="grid grid-cols-2 items-end max-xs:grid-cols-1 max-xs:gap-y-3">
        <div className="space-y-1">
          <TooltipInfo
            title={`Emissions activate when OHM premium over EM backing ($${state.backing.toFixed(2)}) exceeds ${thresholdPct.toFixed(0)}%. Current premium: ${currentPremium.toFixed(1)}%. OHM needs to reach ${formatUsd(emissionTriggerPrice)} to trigger.`}
            className="text-sm font-normal text-secondary-t"
          >
            Premium to Threshold
          </TooltipInfo>
          <div className="flex items-center gap-x-2">
            <CircleProgress
              value={Math.min(premiumProgress, 100)}
              size={28}
              strokeWidth={4}
              type={premiumExceedsThreshold ? "success" : "warning"}
            />
            <NumberFlow
              className="text-[32px]/[40px] font-semibold [--number-flow-char-height:1.25em]"
              format={{ style: "percent" }}
              value={currentPremium / 100}
            />
          </div>
        </div>
        <div className="space-y-0.5">
          <p className="text-xs font-normal text-secondary-t">Trigger Price</p>
          <NumberFlow
            className="text-sm font-semibold"
            value={emissionTriggerPrice}
            suffix="/OHM"
          />
        </div>
      </div>

      <Separator className="my-4" />

      <div className="grid grid-cols-2 max-xs:grid-cols-1 max-xs:gap-y-4">
        <div>
          <TooltipInfo
            title="The base rate of OHM supply expansion per beat when emissions are active."
            className="text-xs font-normal text-secondary-t"
          >
            Base Rate
          </TooltipInfo>
          <NumberFlow
            className="text-sm font-semibold"
            value={state.baseEmissionRate}
            format={{ style: "percent" }}
          />
        </div>
        <div>
          <TooltipInfo
            title="Backing price used by the Emission Manager to calculate premium. Updated periodically."
            className="text-xs font-normal text-secondary-t"
          >
            EM Backing
          </TooltipInfo>
          <NumberFlow className="text-sm font-semibold" value={state.backing} />
        </div>
      </div>

      {em.recentBackingUpdates.length > 0 && (
        <>
          <Separator className="my-4" />
          <div className="mb-3">
            <TooltipInfo
              title={`Last ${em.recentBackingUpdates.length} emission beats showing OHM supply added and reserves collected per beat.`}
              className="text-xs font-semibold uppercase tracking-[0.08em] text-primary-t"
            >
              Last {em.recentBackingUpdates.length} Emission Beats
            </TooltipInfo>
          </div>
          <div className="grid grid-cols-2">
            <div>
              <p className="text-xs font-normal text-secondary-t">Supply Emitted</p>
              <NumberFlow
                className="text-sm font-semibold"
                format={{ style: "decimal", notation: "standard" }}
                value={Math.round(em.totalSupplyEmitted)}
                prefix="+"
                suffix="OHM"
              />
            </div>
            <div>
              <p className="text-xs font-normal text-secondary-t">Reserves Added</p>
              <NumberFlow
                className="text-sm font-semibold"
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
