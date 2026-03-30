import { Card } from "@/components/ui/card";
import type { ClearingHouseData } from "@/lib/hooks/cooler/useGetClearingHouse";
import type { CoolerLoan } from "@/lib/hooks/cooler/useGetCoolerLoans";
import { formatAmount } from "../utils/format";

interface V1StatsBarProps {
  clearingHouseData: ClearingHouseData | null | undefined;
  loans: CoolerLoan[];
  isLoading: boolean;
}

export function V1StatsBar({ clearingHouseData, loans, isLoading }: V1StatsBarProps) {
  const totalPrincipal = loans.reduce((sum, loan) => sum + loan.principal, 0n);
  const debtAsset = clearingHouseData?.debtAssetName ?? "DAI";

  const stats = [
    {
      label: "Capacity Remaining",
      value: clearingHouseData
        ? `${formatAmount(clearingHouseData.capacity)} ${debtAsset}`
        : "--",
    },
    {
      label: "Borrow per gOHM",
      value: clearingHouseData
        ? `${Number(clearingHouseData.loanToCollateral).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${debtAsset}`
        : "--",
    },
    {
      label: "Borrow Rate",
      value: clearingHouseData
        ? `${Number(clearingHouseData.interestRate).toFixed(2)}%`
        : "--",
    },
    {
      label: "Amount Borrowed",
      value: loans.length > 0
        ? `${formatAmount(totalPrincipal)} ${debtAsset}`
        : "--",
    },
  ];

  return (
    <div data-slot="v1-stats-bar" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="flex flex-col gap-1 p-4">
          <p className="text-md text-secondary-t">{stat.label}</p>
          <p className="text-xl font-semibold">
            {isLoading ? "..." : stat.value}
          </p>
        </Card>
      ))}
    </div>
  );
}
