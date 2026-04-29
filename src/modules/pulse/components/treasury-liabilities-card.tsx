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
import { useGohmIndex, useGohmTotalSupply } from "@/lib/hooks/useGohmConversion";
import { useOhmPrice } from "@/lib/hooks/liveness/useOhmPrice";
import { RiCornerDownRightLine } from "@remixicon/react";

const DECIMAL_FORMAT = { style: "decimal", notation: "standard" } as const;
const COMPACT_FORMAT = { style: "decimal", notation: "compact", maximumFractionDigits: 2 } as const;

function OhmValue({
  value,
  compact = false,
  prefix,
}: {
  value: number;
  compact?: boolean;
  prefix?: string;
}) {
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

function OhmValueSm({ value, prefix }: { value: number; prefix?: string }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <Icon name="OHMTokenIcon" className="size-3.5" />
      <NumberFlow
        value={value}
        format={COMPACT_FORMAT}
        prefix={prefix}
        suffix="OHM"
        className="text-xs font-semibold"
      />
    </div>
  );
}

export function TreasuryLiabilitiesCard() {
  const { data: metrics } = useTreasuryMetrics();
  const { data: cooler } = useCoolerMetrics();
  const { data: cd } = useCdStatistics();
  const { data: yrfHistory } = useYrfHistory();
  const { data: ohmPriceData } = useOhmPrice();
  const { index } = useGohmIndex();
  const { totalSupply: gohmTotalSupplyBigint } = useGohmTotalSupply();

  const ohmTotalSupply = metrics?.ohmTotalSupply ?? 0;

  const wrappedAsOhm =
    gohmTotalSupplyBigint !== undefined && index !== undefined
      ? Number((gohmTotalSupplyBigint * index) / 10n ** 27n)
      : 0;
  const wrappedPct = ohmTotalSupply > 0 ? Math.round((wrappedAsOhm / ohmTotalSupply) * 100) : 0;

  const totalCollateralGohm = cooler?.totalCollateralGohm ?? 0;
  const coolerOhm = index !== undefined ? totalCollateralGohm * (Number(index) / 1e9) : 0;

  const supplyGrowthOhm = cd?.supplyGrowthOhm ?? 0;

  const weeklyYield = yrfHistory?.currentWeeklyYield ?? 0;
  const ohmPrice = ohmPriceData?.price ?? 0;
  const weeklyBurns = ohmPrice > 0 ? weeklyYield / ohmPrice : 0;
  const annualBurns = weeklyBurns * 52;
  const burnRatePct = ohmTotalSupply > 0 ? (annualBurns / ohmTotalSupply) * 100 : 0;

  return (
    <Card className="flex flex-col gap-4 p-5">
      <h3 className="text-[18px]/[20px] font-semibold">Liabilities</h3>

      <Separator />

      <div className="flex items-start justify-between gap-4">
        <p className="text-primary-t text-sm font-semibold">Total OHM Supply</p>
        <OhmValue value={ohmTotalSupply} />
      </div>

      <div className="bg-surface-a3 border border-a3-b flex flex-col gap-2 rounded-xl py-3.5 pl-3 pr-3.5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-1.5">
            <RiCornerDownRightLine className="text-secondary-t size-4 shrink-0" />
            <div>
              <p className="text-xs font-semibold">Wrapped as gOHM</p>
              <p className="text-secondary-t text-xs font-normal">~{wrappedPct}% of supply</p>
            </div>
          </div>
          <OhmValueSm value={wrappedAsOhm} />
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-1.5">
            <RiCornerDownRightLine className="text-secondary-t size-4 shrink-0" />
            <div>
              <p className="text-xs font-semibold">Deposited in Cooler as collateral</p>
              <p className="text-secondary-t text-xs font-normal">
                <NumberFlow
                  value={totalCollateralGohm}
                  format={{ style: "decimal", notation: "compact", maximumFractionDigits: 0 }}
                  suffix=" gOHM"
                />
              </p>
            </div>
          </div>
          <OhmValueSm value={coolerOhm} prefix="≈ " />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <TooltipInfo title="New OHM minted on successful CD conversion">
          <p className="text-primary-t text-sm font-semibold">Inflation</p>
        </TooltipInfo>
        <OhmValue value={supplyGrowthOhm} prefix="+" />
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-primary-t text-sm font-semibold">YRF Annual Burn Rate</p>
        <p className="text-sm font-semibold [--number-flow-char-height:20px]">
          <NumberFlow
            value={burnRatePct / 100}
            format={{ style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }}
            prefix="–"
          />
          /yr
        </p>
      </div>

      <ProtocolDataSource sources={["gOHM contract", "CD Subgraph", "YRF Subgraph"]} />
    </Card>
  );
}
