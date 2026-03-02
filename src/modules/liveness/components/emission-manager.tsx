import { Card } from "@/components/ui/card";
import { DataSource } from "./data-source";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { TooltipInfo } from "@/components/ui/tooltip";
import { useEmissionManager } from "@/lib/hooks/liveness/useEmissionManager";
import { useOhmPrice } from "@/lib/hooks/liveness/useOhmPrice";
import { formatUsd, formatNumber } from "@/lib/liveness/formatters";

export function EmissionManager() {
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
  const statusDot = state.isEnabled
    ? "size-2 rounded-full bg-green animate-pulse"
    : state.isActive
      ? "size-2 rounded-full bg-yellow"
      : "size-2 rounded-full bg-red";

  const ohmPrice = price?.price ?? 0;
  const currentPremium = state.backing > 0 ? ((ohmPrice - state.backing) / state.backing) * 100 : 0;

  const thresholdPct = state.minimumPremium * 100;
  const premiumProgress = thresholdPct > 0 ? Math.max(0, (currentPremium / thresholdPct) * 100) : 0;
  const premiumExceedsThreshold = currentPremium >= thresholdPct;

  const emissionTriggerPrice = state.backing * (1 + state.minimumPremium);

  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <TooltipInfo
          title="The Emission Manager controls OHM supply expansion when price premium over backing exceeds the minimum threshold."
          className="text-xs font-medium uppercase tracking-widest"
        >
          Emission Manager
        </TooltipInfo>
        <div className="flex items-center gap-2">
          <div className={statusDot} />
          <span className="text-xs text-secondary-t">{statusLabel}</span>
        </div>
      </div>

      {/* Premium Gauge — hero element */}
      <div
        className={`mb-5 rounded-2xl border px-5 py-4 ${
          premiumExceedsThreshold
            ? "border-green/10 bg-green/[0.03]"
            : "border-yellow/10 bg-yellow/[0.03]"
        }`}
      >
        <TooltipInfo
          title={`Emissions activate when OHM premium over EM backing ($${state.backing.toFixed(2)}) exceeds ${thresholdPct.toFixed(0)}%. Current premium: ${currentPremium.toFixed(1)}%. OHM needs to reach ${formatUsd(emissionTriggerPrice)} to trigger.`}
          className="text-xs text-tertiary-t"
        >
          Premium to Threshold
        </TooltipInfo>
        <div className="mt-2 flex items-end justify-between gap-4">
          <div>
            <p
              className={`tabular-nums text-3xl font-bold tracking-tight ${premiumExceedsThreshold ? "text-green" : ""}`}
            >
              {currentPremium > 0
                ? `+${currentPremium.toFixed(1)}%`
                : `${currentPremium.toFixed(1)}%`}
            </p>
            <p className="mt-0.5 text-xs text-tertiary-t tabular-nums">
              {thresholdPct.toFixed(0)}% needed to trigger
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-tertiary-t">Trigger price</p>
            <p className="tabular-nums text-lg font-semibold">{formatUsd(emissionTriggerPrice)}</p>
          </div>
        </div>
        <Progress
          value={premiumProgress}
          className="mt-3 h-2 bg-yellow/10"
          indicatorClassName={
            premiumExceedsThreshold
              ? "bg-gradient-to-r from-green/15 to-green"
              : "bg-gradient-to-r from-yellow/15 to-yellow"
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <TooltipInfo
            title="The base rate of OHM supply expansion per beat when emissions are active."
            className="text-xs text-tertiary-t"
          >
            Base Rate
          </TooltipInfo>
          <p className="tabular-nums text-lg font-semibold">
            {(state.baseEmissionRate * 100).toFixed(2)}%
          </p>
        </div>
        <div>
          <TooltipInfo
            title="Backing price used by the Emission Manager to calculate premium. Updated periodically."
            className="text-xs text-tertiary-t"
          >
            EM Backing
          </TooltipInfo>
          <p className="tabular-nums text-lg font-semibold">{formatUsd(state.backing)}</p>
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
              <p className="tabular-nums text-lg font-semibold">
                +{formatNumber(Math.round(em.totalSupplyEmitted))} OHM
              </p>
            </div>
            <div>
              <p className="text-xs text-tertiary-t">Reserves Added</p>
              <p className="tabular-nums text-lg font-semibold">
                +{formatUsd(em.totalReservesAdded, true)}
              </p>
            </div>
          </div>
        </>
      )}
      <DataSource sources={["Emission Manager Subgraph", "Treasury API"]} />
    </Card>
  );
}
