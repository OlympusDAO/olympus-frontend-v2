import type React from "react";
import { Card } from "@/components/ui/card";
import { useClearinghouseStats, useBorrowers } from "@/lib/hooks/cooler/useV1Data";
import { useV2ProtocolData, useV2Accounts } from "@/lib/hooks/cooler/useV2Data";
import { useV1UtilizationData } from "@/lib/hooks/cooler/useV1UtilizationData";
import { formatUSD, formatGOHM } from "@/lib/hooks/cooler/utils";

export const ProtocolOverview: React.FC = () => {
  const { data: v1Stats, isLoading: v1StatsLoading } = useClearinghouseStats();
  const { data: v1UtilData, isLoading: v1UtilLoading } = useV1UtilizationData();
  const { data: v1BorrowersData, isLoading: v1BorrowersLoading } = useBorrowers();
  const { data: v2Data, isLoading: v2Loading } = useV2ProtocolData();
  const { data: v2Accounts, isLoading: v2AccountsLoading } = useV2Accounts();

  const isLoading =
    v1StatsLoading || v1UtilLoading || v1BorrowersLoading || v2Loading || v2AccountsLoading;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-6">
            <div className="w-24 h-4 bg-surface-a5 rounded animate-pulse mb-3" />
            <div className="w-32 h-8 bg-surface-a5 rounded animate-pulse mb-2" />
            <div className="w-20 h-3 bg-surface-a5 rounded animate-pulse" />
          </Card>
        ))}
      </div>
    );
  }

  // V1 collateral from borrower records
  const allV1Borrowers =
    v1BorrowersData?.pages.flatMap((page) => page.borrowerStats_collection) ?? [];
  const v1TotalCollateral = allV1Borrowers.reduce(
    (acc, curr) => acc + Number(curr.currentCollateral || 0),
    0,
  );

  // V1 debt from utilization snapshots
  const latestV1Util = v1UtilData.length > 0 ? v1UtilData[v1UtilData.length - 1] : null;
  const v1TotalDebt = latestV1Util?.totalPrincipalReceivables ?? 0;

  // V1 borrowers and active loans from clearinghouse stats
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

  // Combined
  const totalCollateral = v1TotalCollateral + v2TotalCollateral;
  const totalDebt = v1TotalDebt + v2TotalDebt;
  const totalBorrowers = v1TotalBorrowers + v2TotalAccounts;
  const totalPositions = v1ActiveLoans + v2ActivePositions;

  const metrics = [
    {
      label: "Total Collateral",
      value: `${formatGOHM(totalCollateral)} gOHM`,
      sub: "Across all versions",
    },
    {
      label: "Total Debt",
      value: formatUSD(totalDebt),
      sub: "Outstanding debt",
    },
    {
      label: "Total Borrowers",
      value: totalBorrowers.toLocaleString(),
      sub: "Unique borrowers",
    },
    {
      label: "Active Positions",
      value: totalPositions.toLocaleString(),
      sub: "Loans and positions",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric) => (
        <Card key={metric.label} className="p-6">
          <span className="text-sm text-secondary-t">{metric.label}</span>
          <p className="text-2xl font-semibold mt-1">{metric.value}</p>
          <span className="text-xs text-tertiary-t">{metric.sub}</span>
        </Card>
      ))}
    </div>
  );
};
