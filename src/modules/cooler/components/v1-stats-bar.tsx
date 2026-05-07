import { formatTokenAmount } from "@/lib/math";
import { NumberFlow } from "@/components/ui/number-flow";
import { Card } from "@/components/ui/card";
import type { Format } from "@number-flow/react";
import type { ClearingHouseData } from "@/lib/hooks/cooler/useGetClearingHouse";
import type { CoolerLoan } from "@/lib/hooks/cooler/useGetCoolerLoans";

interface V1StatsBarProps {
  clearingHouseData: ClearingHouseData | null | undefined;
  loans: CoolerLoan[];
  isLoading: boolean;
}

type Stat = {
  label: string;
  value: number | "-";
  format: Format;
  suffix?: string;
  suffixNoSpace?: boolean;
};

export function V1StatsBar({ clearingHouseData, loans, isLoading }: V1StatsBarProps) {
  const totalPrincipal = loans.reduce((sum, loan) => sum + loan.principal, 0n);
  const debtAsset = clearingHouseData?.debtAssetName ?? "DAI";

  const stats: Stat[] = [
    {
      label: "Capacity Remaining",
      value: clearingHouseData ? formatTokenAmount(clearingHouseData.capacity) : "-",
      format: { style: "decimal", maximumFractionDigits: 0 },
      suffix: debtAsset,
    },
    {
      label: "Borrow per gOHM",
      value: clearingHouseData ? parseFloat(clearingHouseData.loanToCollateral) : "-",
      format: { style: "decimal", minimumFractionDigits: 2, maximumFractionDigits: 2 },
      suffix: debtAsset,
    },
    {
      label: "Borrow Rate",
      value: clearingHouseData ? parseFloat(clearingHouseData.interestRate) : "-",
      format: { style: "decimal", minimumFractionDigits: 2, maximumFractionDigits: 2 },
      suffix: "%",
      suffixNoSpace: true,
    },
    {
      label: "Amount Borrowed",
      value: loans.length > 0 ? formatTokenAmount(totalPrincipal) : "-",
      format: { style: "decimal", maximumFractionDigits: 0 },
      suffix: debtAsset,
    },
  ];

  return (
    <div data-slot="v1-stats-bar" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="flex flex-col gap-1 px-6 py-5">
          <p className="text-base text-secondary-t">{stat.label}</p>
          <NumberFlow
            className="text-xl/[24px] font-semibold tracking-[0.2px]"
            value={isLoading ? "-" : stat.value}
            format={stat.format}
            suffix={stat.suffix}
            suffixNoSpace={stat.suffixNoSpace}
          />
        </Card>
      ))}
    </div>
  );
}
