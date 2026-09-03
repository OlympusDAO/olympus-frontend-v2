import type React from "react";
import { Card } from "@/components/ui/card.tsx";
import { Tooltip as InfoTooltip } from "@/components/ui/tooltip.tsx";
import { RiInformationFill } from "@remixicon/react";
import { useConversionExposure, useCdRevenue } from "@/lib/hooks/cds/useStatisticsData.tsx";
import { useTreasuryMetrics } from "@/modules/pulse/hooks/useTreasuryMetrics.ts";

interface StatCardProps {
  title: string;
  value: string;
  tooltip: string;
  subtitle?: string;
  children?: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, tooltip, subtitle, children }) => {
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
      {children}
    </Card>
  );
};

interface StatRowProps {
  label: string;
  value: string;
  muted?: boolean;
}

const StatRow: React.FC<StatRowProps> = ({ label, value, muted }) => (
  <div className="flex items-baseline justify-between gap-3 text-xs">
    <span className={muted ? "text-tertiary-t" : "text-secondary-t"}>{label}</span>
    <span className={muted ? "text-tertiary-t" : "font-medium text-primary-t"}>{value}</span>
  </div>
);

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
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

const LoadingCards: React.FC<{ count: number }> = ({ count }) => (
  <>
    {Array.from({ length: count }, (_, i) => i + 1).map((slot) => (
      <Card key={slot} className="p-4">
        <div className="w-40 h-4 bg-surface-a5 rounded animate-pulse mb-3" />
        <div className="w-24 h-8 bg-surface-a5 rounded animate-pulse" />
      </Card>
    ))}
  </>
);

/**
 * A failed indexer read must not render as zeros: "+$0.00" and "0 of 0 in the money"
 * are indistinguishable from a protocol with no deposits.
 */
const ErrorCards: React.FC<{ count: number }> = ({ count }) => (
  <>
    {Array.from({ length: count }, (_, i) => i + 1).map((slot) => (
      <Card key={slot} className="p-4">
        <p className="text-sm font-medium text-secondary-t mb-2">Data unavailable</p>
        <p className="text-xs text-tertiary-t">
          The convertible deposit indexer could not be reached. Figures are hidden rather than shown
          as zero.
        </p>
      </Card>
    ))}
  </>
);

export const MetricsConversionStats: React.FC = () => {
  const {
    data: treasuryMetrics,
    isLoading: isLoadingTreasury,
    isError: isTreasuryError,
  } = useTreasuryMetrics();
  const {
    data: exposure,
    isLoading: isLoadingExposure,
    isError: isExposureError,
  } = useConversionExposure();
  const { data: revenue, isLoading: isLoadingRevenue, isError: isRevenueError } = useCdRevenue();

  const isLoading = isLoadingTreasury || isLoadingExposure;
  const isError = isTreasuryError || isExposureError;

  const backedSupply = treasuryMetrics?.ohmBackedSupply || 0;
  const liquidBacking = treasuryMetrics?.treasuryLiquidBacking || 0;
  const currentBackingPerOhm = treasuryMetrics?.treasuryLiquidBackingPerOhmBacked || 0;

  // Headline figures assume leverage unwinds: deposits sitting behind an active loan
  // were funded by principal the vault already paid out, and a borrower who walks away
  // leaves the collateral without minting OHM. Counting those deposits gross would
  // double-count capital that looped through borrow-and-redeposit.
  const treasuryGrowthUsd = exposure?.netDepositsUsd ?? 0;
  const supplyGrowthOhm = exposure?.netConvertibleOhm ?? 0;
  const grossTreasuryGrowthUsd = exposure?.grossDepositsUsd ?? 0;
  const grossSupplyGrowthOhm = exposure?.grossConvertibleOhm ?? 0;
  const borrowedPrincipalUsd = exposure?.borrowedPrincipalUsd ?? 0;

  const backingPerOhmIncrease = (() => {
    if (backedSupply <= 0 || liquidBacking <= 0 || supplyGrowthOhm <= 0 || treasuryGrowthUsd <= 0)
      return 0;

    const newBackingPerOhm = (liquidBacking + treasuryGrowthUsd) / (backedSupply + supplyGrowthOhm);

    return newBackingPerOhm - currentBackingPerOhm;
  })();

  const backingGrowthPercent =
    currentBackingPerOhm > 0 ? (backingPerOhmIncrease / currentBackingPerOhm) * 100 : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoading ? (
          <LoadingCards count={3} />
        ) : isError ? (
          <ErrorCards count={3} />
        ) : (
          <>
            <StatCard
              title="Backing Growth on Conversion"
              value={`+${backingGrowthPercent.toFixed(2)}%`}
              tooltip="Percentage increase in liquid backing per OHM if outstanding convertible deposits convert. Uses the same leverage-unwind scenario as Treasury and Supply Growth, so all three describe one outcome."
              subtitle={`+$${backingPerOhmIncrease.toFixed(2)} per OHM`}
            />

            <StatCard
              title="Treasury Growth on Conversion"
              value={`+${formatCurrency(treasuryGrowthUsd)}`}
              tooltip="USD the treasury keeps if outstanding convertible deposits convert, net of principal already borrowed back out against pending redemptions. Borrowed cash is commonly redeposited as a new position, so the gross figure counts the same capital more than once."
              subtitle={`${formatCurrency(grossTreasuryGrowthUsd)} gross − ${formatCurrency(borrowedPrincipalUsd)} borrowed`}
            />

            <StatCard
              title="Supply Growth on Conversion"
              value={`+${formatOhm(supplyGrowthOhm)}`}
              tooltip="New OHM minted if outstanding convertible deposits convert at their locked-in prices. Deposits behind an active loan only convert if the borrower repays out of outside capital; the gross figure assumes they all do."
              subtitle={`${formatOhm(grossSupplyGrowthOhm)} if every deposit converts`}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoadingRevenue ? (
          <LoadingCards count={1} />
        ) : isRevenueError ? (
          <ErrorCards count={1} />
        ) : (
          <StatCard
            title="Revenue from Interest & Fees"
            value={formatCurrency(revenue?.earnedToDate ?? 0)}
            tooltip="Earned to date across the redemption vault and the deposit facility: interest collected on repaid loans, interest accrued so far on open loans, and deposit-asset yield swept to the treasury."
            subtitle="Redemption vault loans and deposit yield, all-time"
          >
            <div className="flex flex-col gap-1.5 mt-3 pt-3 border-t border-a10-b">
              <StatRow
                label="Loan interest collected"
                value={formatCurrency(revenue?.realizedLoanInterest ?? 0)}
              />
              <StatRow
                label="Accrued on open loans"
                value={formatCurrency(revenue?.accruedLoanInterest ?? 0)}
              />
              <StatRow
                label="Deposit yield claimed"
                value={formatCurrency(revenue?.claimedDepositYield ?? 0)}
              />
              <StatRow
                label="Contracted on open loans"
                value={formatCurrency(revenue?.contractedLoanInterest ?? 0)}
                muted
              />
            </div>
          </StatCard>
        )}
      </div>
    </div>
  );
};
