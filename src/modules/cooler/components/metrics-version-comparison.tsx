import type React from "react";
import { Card } from "@/components/ui/card.tsx";
import { NumberFlow } from "@/components/ui/number-flow.tsx";
import { useClearinghouseStats, useBorrowers } from "@/lib/hooks/cooler/useV1Data.ts";
import { useV2ProtocolData, useV2Accounts } from "@/lib/hooks/cooler/useV2Data.ts";
import { useV1UtilizationData } from "@/lib/hooks/cooler/useV1UtilizationData.ts";
import type { Format } from "@number-flow/react";

const fmtGOHM: Format = { style: "decimal", minimumFractionDigits: 2, maximumFractionDigits: 2 };
const fmtUSD: Format = {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
};
const fmtCount: Format = { style: "decimal", notation: "standard", maximumFractionDigits: 0 };

export const MetricsVersionComparison: React.FC = () => {
  const { data: v1Stats, isLoading: v1StatsLoading } = useClearinghouseStats();
  const { data: v1UtilData, isLoading: v1UtilLoading } = useV1UtilizationData();
  const { data: v1BorrowersData, isLoading: v1BorrowersLoading } = useBorrowers();
  const { data: v2Data, isLoading: v2Loading } = useV2ProtocolData();
  const { data: v2Accounts, isLoading: v2AccountsLoading } = useV2Accounts();

  const isLoading =
    v1StatsLoading || v1UtilLoading || v1BorrowersLoading || v2Loading || v2AccountsLoading;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="px-6 py-5">
            <div className="w-20 h-5 bg-surface-a5 rounded animate-pulse mb-4" />
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex flex-col gap-1">
                  <div className="w-16 h-4 bg-surface-a5 rounded animate-pulse" />
                  <div className="w-24 h-6 bg-surface-a5 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    );
  }

  // V1 data
  const allV1Borrowers =
    v1BorrowersData?.pages.flatMap((page) => page.borrowerStats_collection) ?? [];
  const v1TotalCollateral = allV1Borrowers.reduce(
    (acc, curr) => acc + Number(curr.currentCollateral || 0),
    0,
  );
  const latestV1Util = v1UtilData.length > 0 ? v1UtilData[v1UtilData.length - 1] : null;
  const v1TotalDebt = latestV1Util?.totalPrincipalReceivables ?? 0;
  const v1TotalBorrowers =
    v1Stats?.clearinghouseCumulativeStats_collection.reduce(
      (acc, curr) => acc + curr.totalUniqueBorrowers,
      0,
    ) ?? 0;
  const v1ActiveLoans =
    v1Stats?.clearinghouseCumulativeStats_collection.reduce(
      (acc, curr) => acc + curr.currentActiveLoans,
      0,
    ) ?? 0;

  // V2 data
  const v2TotalCollateral = v2Data?.totalCollateral ?? 0;
  const v2TotalDebt = v2Data?.totalDebt ?? 0;
  const v2TotalAccounts = v2Accounts?.length ?? 0;
  const v2ActivePositions = v2Accounts?.filter((a) => a.debt > 0).length ?? 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Cooler V1 */}
      <Card className="px-6 py-5">
        <h3 className="text-base font-medium text-secondary-t mb-4">Cooler V1</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-base text-secondary-t">Collateral</span>
            <NumberFlow
              className="text-xl/[24px] font-semibold tracking-[0.2px]"
              value={v1TotalCollateral}
              format={fmtGOHM}
              suffix="gOHM"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-base text-secondary-t">Debt</span>
            <NumberFlow
              className="text-xl/[24px] font-semibold tracking-[0.2px]"
              value={v1TotalDebt}
              format={fmtUSD}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-base text-secondary-t">Borrowers</span>
            <NumberFlow
              className="text-xl/[24px] font-semibold tracking-[0.2px]"
              value={v1TotalBorrowers}
              format={fmtCount}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-base text-secondary-t">Active Loans</span>
            <NumberFlow
              className="text-xl/[24px] font-semibold tracking-[0.2px]"
              value={v1ActiveLoans}
              format={fmtCount}
            />
          </div>
        </div>
      </Card>

      {/* Cooler V2 */}
      <Card className="px-6 py-5">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-base font-medium text-secondary-t">Cooler V2</h3>
          <span className="bg-green/15 text-green text-xs font-medium px-2 py-0.5 rounded">
            Current
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-base text-secondary-t">Collateral</span>
            <NumberFlow
              className="text-xl/[24px] font-semibold tracking-[0.2px]"
              value={v2TotalCollateral}
              format={fmtGOHM}
              suffix="gOHM"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-base text-secondary-t">Debt</span>
            <NumberFlow
              className="text-xl/[24px] font-semibold tracking-[0.2px]"
              value={v2TotalDebt}
              format={fmtUSD}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-base text-secondary-t">Borrowers</span>
            <NumberFlow
              className="text-xl/[24px] font-semibold tracking-[0.2px]"
              value={v2TotalAccounts}
              format={fmtCount}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-base text-secondary-t">Active Positions</span>
            <NumberFlow
              className="text-xl/[24px] font-semibold tracking-[0.2px]"
              value={v2ActivePositions}
              format={fmtCount}
            />
          </div>
        </div>
      </Card>
    </div>
  );
};
