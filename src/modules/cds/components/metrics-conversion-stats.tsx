import type React from "react";
import { Card } from "@/components/ui/card.tsx";
import { Tooltip as InfoTooltip } from "@/components/ui/tooltip.tsx";
import { RiInformationFill } from "@remixicon/react";
import { useCurrentConvertibleOhm } from "@/lib/hooks/cds/useStatisticsData.tsx";
import { useTreasuryMetrics } from "@/modules/pulse/hooks/useTreasuryMetrics.ts";

interface StatCardProps {
  title: string;
  value: string;
  tooltip: string;
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, tooltip, subtitle }) => {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-1.5 mb-2">
        <h4 className="text-sm font-medium text-secondary-t">{title}</h4>
        <InfoTooltip title={tooltip}>
          <RiInformationFill size={14} className="text-tertiary-t" />
        </InfoTooltip>
      </div>
      <p className="text-2xl font-semibold">{value}</p>
      {subtitle && <p className="text-xs text-secondary-t mt-1">{subtitle}</p>}
    </Card>
  );
};

export const MetricsConversionStats: React.FC = () => {
  const { data: treasuryMetrics, isLoading: isLoadingTreasury } = useTreasuryMetrics();
  const { data: convertibleData, isLoading: isLoadingConvertibleOhm } = useCurrentConvertibleOhm();

  const isLoading = isLoadingTreasury || isLoadingConvertibleOhm;

  // Get backed supply and liquid backing from treasury API
  const backedSupply = treasuryMetrics?.ohmBackedSupply || 0;
  const liquidBacking = treasuryMetrics?.treasuryLiquidBacking || 0;
  const currentBackingPerOhm = treasuryMetrics?.treasuryLiquidBackingPerOhmBacked || 0;

  // Supply Growth on Conversion (new OHM minted)
  // This is the OHM that would be minted if all CURRENT deposits convert
  const supplyGrowthOhm = convertibleData?.convertibleOhm ?? 0;

  // Treasury Growth on Conversion (USD added to treasury)
  // When deposits convert, treasury receives the deposited USD value
  // Using the same positions data as OHM calculation for consistency
  const treasuryGrowthUsd = convertibleData?.totalDepositsUsd ?? 0;

  // Backing Growth on Conversion
  // New backing = (currentLiquidBacking + treasuryGrowthUsd) / (backedSupply + newOhmSupply)
  // Backing growth % = ((newBacking - currentBacking) / currentBacking) * 100
  const backingGrowthPercent = (() => {
    if (backedSupply <= 0 || liquidBacking <= 0 || supplyGrowthOhm <= 0 || treasuryGrowthUsd <= 0)
      return 0;

    const newTotalBacking = liquidBacking + treasuryGrowthUsd;
    const newTotalSupply = backedSupply + supplyGrowthOhm;
    const newBackingPerOhm = newTotalBacking / newTotalSupply;

    return ((newBackingPerOhm - currentBackingPerOhm) / currentBackingPerOhm) * 100;
  })();

  // Backing per OHM increase (absolute value)
  const backingPerOhmIncrease = (() => {
    if (backedSupply <= 0 || liquidBacking <= 0 || supplyGrowthOhm <= 0 || treasuryGrowthUsd <= 0)
      return 0;

    const newTotalBacking = liquidBacking + treasuryGrowthUsd;
    const newTotalSupply = backedSupply + supplyGrowthOhm;
    const newBackingPerOhm = newTotalBacking / newTotalSupply;

    return newBackingPerOhm - currentBackingPerOhm;
  })();

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  const formatOhm = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M OHM`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(2)}K OHM`;
    }
    return `${value.toFixed(2)} OHM`;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <div className="w-40 h-4 bg-surface-a5 rounded animate-pulse mb-3" />
            <div className="w-24 h-8 bg-surface-a5 rounded animate-pulse" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        title="Backing Growth on Conversion"
        value={`+${backingGrowthPercent.toFixed(2)}%`}
        tooltip="Percentage increase in liquid backing per OHM if all convertible deposits convert to OHM at current prices."
        subtitle={`+${backingPerOhmIncrease.toFixed(2)} USD/OHM`}
      />

      <StatCard
        title="Treasury Growth on Conversion"
        value={`+${formatCurrency(treasuryGrowthUsd)}`}
        tooltip="USD value added to the treasury if all convertible deposits convert."
      />

      <StatCard
        title="Supply Growth on Conversion"
        value={`+${formatOhm(supplyGrowthOhm)}`}
        tooltip="New OHM tokens that would be minted if all convertible deposits convert, based on each deposit's locked-in conversion price."
      />
    </div>
  );
};
