import { Card } from "@/components/ui/card.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { NumberFlow } from "@/components/ui/number-flow.tsx";
import { Icon } from "@/components/icon.tsx";
import { ProtocolDataSource } from "@/modules/pulse/components/protocol-data-source.tsx";
import { useTreasuryMetrics } from "@/modules/pulse/hooks/useTreasuryMetrics";
import { useCoolerMetrics } from "@/modules/pulse/hooks/useCoolerMetrics";
import { useCdStatistics } from "@/modules/pulse/hooks/useCdStatistics";
import { useEmissionManager } from "@/modules/pulse/hooks/useEmissionManager";
import { useYrfHistory } from "@/modules/pulse/hooks/useYrfHistory";
import { useGohmIndex, useGohmTotalSupply } from "@/lib/hooks/useGohmConversion";
import { useOhmPrice } from "@/lib/hooks/liveness/useOhmPrice";
import { RiCornerDownRightLine } from "@remixicon/react";

const DECIMAL_FORMAT = { style: "decimal", notation: "standard" } as const;
const COMPACT_FORMAT = { style: "decimal", notation: "compact", maximumFractionDigits: 2 } as const;
const PRECISE_USD = {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
} as const;

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
      <Icon name="OHMColorTokenIcon" className="size-5" />
      <NumberFlow
        value={value}
        format={compact ? COMPACT_FORMAT : DECIMAL_FORMAT}
        prefix={prefix}
        suffix="OHM"
        className="font-semibold text-base"
      />
    </div>
  );
}

function OhmValueSm({ value, prefix }: { value: number; prefix?: string }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <Icon name="OHMColorTokenIcon" className="size-4" />
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
  const { data: em } = useEmissionManager();
  const { data: yrfHistory } = useYrfHistory();
  const { data: ohmPriceData } = useOhmPrice();
  const { index } = useGohmIndex();
  const { totalSupply: gohmTotalSupplyBigint } = useGohmTotalSupply();

  const ohmTotalSupply = metrics?.ohmTotalSupply ?? 0;

  // Wrapped as gOHM: gOHM totalSupply × index / 1e9 (to OHM)
  const wrappedAsOhm =
    gohmTotalSupplyBigint !== undefined && index !== undefined
      ? Number((gohmTotalSupplyBigint * index) / 10n ** 27n)
      : 0;
  const wrappedPct = ohmTotalSupply > 0 ? Math.round((wrappedAsOhm / ohmTotalSupply) * 100) : 0;

  // Deposited in Cooler: gOHM collateral → OHM equivalent
  const totalCollateralGohm = cooler?.totalCollateralGohm ?? 0;
  const coolerOhm = index !== undefined ? totalCollateralGohm * (Number(index) / 1e9) : 0;

  // Inflation from CD conversions
  const supplyGrowthOhm = cd?.supplyGrowthOhm ?? 0;

  // YRF Annual Burn Rate (same formula as overview-yrf.tsx)
  const weeklyYield = yrfHistory?.currentWeeklyYield ?? 0;
  const ohmPrice = ohmPriceData?.price ?? 0;
  const weeklyBurns = ohmPrice > 0 ? weeklyYield / ohmPrice : 0;
  const annualBurns = weeklyBurns * 52;
  const burnRatePct = ohmTotalSupply > 0 ? (annualBurns / ohmTotalSupply) * 100 : 0;

  // EM Trigger Price
  const emBacking = em?.state.backing ?? 0;

  return (
    <Card className="flex flex-col gap-4 p-6">
      <h3 className="text-[18px]/[20px] font-semibold">Liabilities</h3>

      <Separator />

      {/* Total OHM Supply */}
      <div className="flex items-start justify-between gap-4">
        <p className="font-bold">Total OHM Supply</p>
        <OhmValue value={ohmTotalSupply} />
      </div>

      {/* Sub-items */}
      <div className="bg-surface-a3 flex flex-col gap-3 rounded-xl py-3.5 px-3">
        {/* Wrapped as gOHM */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-2">
            <RiCornerDownRightLine className="text-secondary-t mt-0.5 size-4 shrink-0" />
            <div>
              <p className="text-xs font-semibold">Wrapped as gOHM</p>
              <p className="text-secondary-t text-xs">~{wrappedPct}% of supply</p>
            </div>
          </div>
          <OhmValueSm value={wrappedAsOhm} />
        </div>

        {/* Deposited in Cooler */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-2">
            <RiCornerDownRightLine className="text-secondary-t mt-0.5 size-4 shrink-0" />
            <div>
              <p className="text-xs font-semibold">Deposited in Cooler as collateral</p>
              <p className="text-secondary-t text-xs">
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

      <Separator />

      {/* Inflation */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-bold">Inflation</p>
          <p className="text-secondary-t text-xs">New OHM minted on successful CD conversion</p>
        </div>
        <OhmValue value={supplyGrowthOhm} prefix="+" />
      </div>

      <Separator />

      {/* YRF Annual Burn Rate */}
      <div className="flex items-center justify-between gap-4">
        <p className="font-bold">YRF Annual Burn Rate</p>
        <p className="font-semibold">
          <NumberFlow
            value={burnRatePct / 100}
            format={{ style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }}
            prefix="–"
          />
          /yr
        </p>
      </div>

      <Separator />

      {/* EM Trigger Price */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-bold">EM Trigger Price</p>
          <p className="text-secondary-t text-xs">
            New supply only emitted when OHM price &gt;{" "}
            <NumberFlow value={emBacking} format={PRECISE_USD} />
          </p>
        </div>
        <p className="font-semibold shrink-0">
          <NumberFlow value={emBacking} format={PRECISE_USD} suffix="/OHM" />
        </p>
      </div>

      <ProtocolDataSource sources={["gOHM contract", "CD Subgraph", "YRF Subgraph"]} />
    </Card>
  );
}
