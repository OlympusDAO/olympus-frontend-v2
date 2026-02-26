import React from "react";
import { Card } from "@/components/ui/card";
import { useClearinghouseStats, useBorrowers } from "@/lib/hooks/cooler/useV1Data";
import { useV2ProtocolData, useV2Accounts } from "@/lib/hooks/cooler/useV2Data";
import { useV1UtilizationData } from "@/lib/hooks/cooler/useV1UtilizationData";
import { formatUSD, formatGOHM } from "@/lib/hooks/cooler/utils";

export const VersionComparison: React.FC = () => {
  const { data: v1Stats, isLoading: v1StatsLoading } = useClearinghouseStats();
  const { data: v1UtilData, isLoading: v1UtilLoading } = useV1UtilizationData();
  const { data: v1BorrowersData, isLoading: v1BorrowersLoading } = useBorrowers();
  const { data: v2Data, isLoading: v2Loading } = useV2ProtocolData();
  const { data: v2Accounts, isLoading: v2AccountsLoading } = useV2Accounts();

  const isLoading = v1StatsLoading || v1UtilLoading || v1BorrowersLoading || v2Loading || v2AccountsLoading;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="p-6">
            <div className="w-20 h-5 bg-surface-a5 rounded animate-pulse mb-4" />
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j}>
                  <div className="w-16 h-3 bg-surface-a5 rounded animate-pulse mb-2" />
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
  const allV1Borrowers = v1BorrowersData?.pages.flatMap(
    (page) => page.borrowerStats_collection,
  ) ?? [];
  const v1TotalCollateral = allV1Borrowers.reduce(
    (acc, curr) => acc + Number(curr.currentCollateral || 0),
    0,
  );
  const latestV1Util = v1UtilData.length > 0
    ? v1UtilData[v1UtilData.length - 1]
    : null;
  const v1TotalDebt = latestV1Util?.totalPrincipalReceivables ?? 0;
  const v1TotalBorrowers = v1Stats?.clearinghouseCumulativeStats_collection.reduce(
    (acc, curr) => acc + curr.totalUniqueBorrowers,
    0,
  ) ?? 0;
  const v1ActiveLoans = v1Stats?.clearinghouseCumulativeStats_collection.reduce(
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
      <Card className="p-6">
        <h3 className="text-base font-medium text-secondary-t mb-4">Cooler V1</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-xs text-secondary-t">Collateral</span>
            <p className="text-lg font-semibold">{formatGOHM(v1TotalCollateral)} gOHM</p>
          </div>
          <div>
            <span className="text-xs text-secondary-t">Debt</span>
            <p className="text-lg font-semibold">{formatUSD(v1TotalDebt)}</p>
          </div>
          <div>
            <span className="text-xs text-secondary-t">Borrowers</span>
            <p className="text-lg font-semibold">{v1TotalBorrowers.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-xs text-secondary-t">Active Loans</span>
            <p className="text-lg font-semibold">{v1ActiveLoans.toLocaleString()}</p>
          </div>
        </div>
      </Card>

      {/* Cooler V2 */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-base font-medium text-secondary-t">Cooler V2</h3>
          <span className="bg-green/15 text-green text-xs font-medium px-2 py-0.5 rounded">
            Current
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-xs text-secondary-t">Collateral</span>
            <p className="text-lg font-semibold">{formatGOHM(v2TotalCollateral)} gOHM</p>
          </div>
          <div>
            <span className="text-xs text-secondary-t">Debt</span>
            <p className="text-lg font-semibold">{formatUSD(v2TotalDebt)}</p>
          </div>
          <div>
            <span className="text-xs text-secondary-t">Borrowers</span>
            <p className="text-lg font-semibold">{v2TotalAccounts.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-xs text-secondary-t">Active Positions</span>
            <p className="text-lg font-semibold">{v2ActivePositions.toLocaleString()}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
