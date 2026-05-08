import { Card } from "@/components/ui/card.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { NumberFlow } from "@/components/ui/number-flow.tsx";
import { TooltipInfo } from "@/components/ui/tooltip.tsx";
import { Icon } from "@/components/icon.tsx";
import { ProtocolDataSource } from "@/modules/pulse/components/protocol-data-source.tsx";
import { useTreasuryMetrics } from "@/modules/pulse/hooks/useTreasuryMetrics";
import { useCoolerMetrics } from "@/modules/pulse/hooks/useCoolerMetrics";
import { useCdStatistics } from "@/modules/pulse/hooks/useCdStatistics";
import { useYrfHistory } from "@/modules/pulse/hooks/useYrfHistory";
import { useOhmPrice } from "@/lib/hooks/liveness/useOhmPrice";
import type { ReactNode } from "react";

const DECIMAL_FORMAT = { style: "decimal", notation: "standard" } as const;
const COMPACT_FORMAT = { style: "decimal", notation: "compact", maximumFractionDigits: 2 } as const;
const COOLER_YRF_USD_PER_GOHM_YEAR = 11.33;

function OhmValue({
  value,
  compact = false,
  prefix,
}: {
  value: number | null;
  compact?: boolean;
  prefix?: string;
}) {
  if (value == null)
    return <span className="text-sm font-semibold text-secondary-t">Unavailable</span>;

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <Icon name="OHMTokenIcon" className="size-5" />
      <NumberFlow
        value={value}
        format={compact ? COMPACT_FORMAT : DECIMAL_FORMAT}
        prefix={prefix}
        suffix="OHM"
        className="text-sm font-semibold [--number-flow-char-height:20px]"
      />
    </div>
  );
}

function FullWidthLiabilityRow({
  label,
  value,
  tooltip,
  subtext,
}: {
  label: string;
  value: ReactNode;
  tooltip?: string;
  subtext?: ReactNode;
}) {
  return (
    <div className="bg-surface-a3 border border-a3-b flex items-center justify-between gap-4 rounded-xl px-3.5 py-3">
      <div className="flex flex-col gap-1">
        {tooltip ? (
          <TooltipInfo title={tooltip}>
            <p className="text-primary-t text-sm font-semibold">{label}</p>
          </TooltipInfo>
        ) : (
          <p className="text-primary-t text-sm font-semibold">{label}</p>
        )}
        {subtext ? <p className="text-secondary-t text-xs font-normal">{subtext}</p> : null}
      </div>
      {value}
    </div>
  );
}

function SupplyRow({
  label,
  value,
  tooltip,
}: {
  label: string;
  value: number | null;
  tooltip?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-3.5 py-3">
      {tooltip ? (
        <TooltipInfo title={tooltip}>
          <p className="text-primary-t text-sm font-semibold">{label}</p>
        </TooltipInfo>
      ) : (
        <p className="text-primary-t text-sm font-semibold">{label}</p>
      )}
      <OhmValue value={value} />
    </div>
  );
}

export function TreasuryLiabilitiesCard() {
  const { data: metrics } = useTreasuryMetrics();
  const { data: cooler } = useCoolerMetrics();
  const { data: cd } = useCdStatistics();
  const { data: yrfHistory } = useYrfHistory();
  const { data: ohmPriceData } = useOhmPrice();

  const ohmTotalSupply = metrics?.ohmTotalSupply ?? null;
  const ohmCirculatingSupply = metrics?.ohmCirculatingSupply ?? null;
  const ohmBackedSupply = metrics?.ohmBackedSupply ?? null;

  const supplyGrowthOhm = cd?.supplyGrowthOhm ?? null;

  const weeklyYield = yrfHistory?.currentWeeklyYield;
  const ohmPrice = ohmPriceData?.price;
  const latestActualWeeklyBurns = yrfHistory?.weeklyYields
    .slice()
    .reverse()
    .find((w) => w.ohmBurned > 0)?.ohmBurned;
  const weeklyBurnsFromBudget =
    ohmPrice && ohmPrice > 0 && weeklyYield != null ? weeklyYield / ohmPrice : null;
  const annualBurnsFromCoolerDrip =
    ohmPrice && ohmPrice > 0 && cooler?.totalCollateralGohm != null
      ? (cooler.totalCollateralGohm * COOLER_YRF_USD_PER_GOHM_YEAR) / ohmPrice
      : null;
  let annualBurns: number | null;
  if (latestActualWeeklyBurns !== undefined) annualBurns = latestActualWeeklyBurns * 52;
  else if (weeklyBurnsFromBudget != null && weeklyBurnsFromBudget > 0)
    annualBurns = weeklyBurnsFromBudget * 52;
  else annualBurns = annualBurnsFromCoolerDrip;
  const burnRatePct =
    annualBurns != null && ohmCirculatingSupply != null && ohmCirculatingSupply > 0
      ? (annualBurns / ohmCirculatingSupply) * 100
      : null;

  return (
    <Card className="flex flex-col gap-4 p-5">
      <h3 className="text-[18px]/[20px] font-semibold">Liabilities</h3>

      <Separator />

      <div className="bg-surface-a3 border border-a3-b divide-a3-b flex flex-col divide-y rounded-xl">
        <SupplyRow label="Total Supply" value={ohmTotalSupply} tooltip="Total Supply of OHM" />
        <SupplyRow
          label="Circulating Supply"
          value={ohmCirculatingSupply}
          tooltip="Total Supply of OHM excluding Treasury Owned Supply"
        />
        <SupplyRow
          label="Backed Supply"
          value={ohmBackedSupply}
          tooltip="Circulating Supply of OHM excluding OHM in Protocol Owned Liquidity"
        />
      </div>

      <FullWidthLiabilityRow
        label="Inflation"
        value={<OhmValue value={supplyGrowthOhm} prefix="+" />}
        tooltip="Net new OHM able to be minted through exercised CDs"
      />

      <FullWidthLiabilityRow
        label="YRF Annual Burn Rate"
        value={<OhmValue value={annualBurns} prefix="–" />}
        tooltip="Annualizes the latest actual weekly OHM burned from YRF"
        subtext={
          burnRatePct == null ? (
            "Awaiting YRF, Cooler, price, and supply data"
          ) : (
            <>
              <NumberFlow
                value={burnRatePct / 100}
                format={{ style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }}
                prefix="–"
              />
              /yr of Circulating Supply at current YRF spend
            </>
          )
        }
      />

      <ProtocolDataSource sources={["Treasury API", "CD Subgraph", "YRF Subgraph"]} />
    </Card>
  );
}
