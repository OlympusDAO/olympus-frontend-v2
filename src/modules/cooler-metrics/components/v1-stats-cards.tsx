import React, { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  useClearinghouseStats,
  useActiveLoans,
  useTopBorrow,
  useTopLooper,
  useTopTotalBorrows,
} from "@/lib/hooks/cooler/useV1Data";
import { formatUSD, calculateDaysUntilDefault } from "@/lib/hooks/cooler/utils";

export const V1StatsCards: React.FC = () => {
  const { data: stats, isLoading: statsLoading } = useClearinghouseStats();
  const { data: activeLoansData, isLoading: loansLoading } = useActiveLoans();
  const { data: topBorrowData, isLoading: topBorrowLoading } = useTopBorrow();
  const { data: topLooperData, isLoading: topLooperLoading } = useTopLooper();
  const { data: topTotalBorrowsData, isLoading: topTotalBorrowsLoading } = useTopTotalBorrows();
  const [defaultDays, setDefaultDays] = useState(5);

  const isLoading =
    statsLoading || loansLoading || topBorrowLoading || topLooperLoading || topTotalBorrowsLoading;

  // Calculate defaulting soon count
  const defaultingStats = useMemo(() => {
    if (!activeLoansData?.pages) return { count: 0, value: 0 };

    const allLoans = activeLoansData.pages.flatMap((page) => page.coolerLoans);
    let count = 0;
    let value = 0;

    allLoans.forEach((loan) => {
      const daysLeft = calculateDaysUntilDefault(
        parseInt(loan.currentExpiryTimestamp),
      );
      if (daysLeft <= defaultDays && daysLeft > 0) {
        count += 1;
        value += Number(loan.principal);
      }
    });

    return { count, value };
  }, [activeLoansData, defaultDays]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 9 }).map((_, i) => (
          <Card key={i} className="p-6">
            <div className="w-24 h-4 bg-surface-a5 rounded animate-pulse mb-3" />
            <div className="w-32 h-8 bg-surface-a5 rounded animate-pulse mb-2" />
            <div className="w-20 h-3 bg-surface-a5 rounded animate-pulse" />
          </Card>
        ))}
      </div>
    );
  }

  const cumulativeStats = stats?.clearinghouseCumulativeStats_collection ?? [];

  const totalBorrowers = cumulativeStats.reduce(
    (acc, curr) => acc + curr.totalUniqueBorrowers,
    0,
  );
  const activeLoopers = cumulativeStats.reduce(
    (acc, curr) => acc + curr.currentActiveLoopers,
    0,
  );
  const totalLoans = cumulativeStats.reduce(
    (acc, curr) => acc + curr.totalLoans,
    0,
  );
  const totalActiveLoans = cumulativeStats.reduce(
    (acc, curr) => acc + curr.currentActiveLoans,
    0,
  );
  const totalDefaults = cumulativeStats.reduce(
    (acc, curr) => acc + curr.totalDefaultedLoans,
    0,
  );

  const highestLoop =
    topLooperData?.borrowerStats_collection?.[0]?.maxActiveLoans ?? 0;
  const highestBorrow =
    topBorrowData?.clearLoanRequestEvents?.[0]?.loan?.principal
      ? Number(topBorrowData.clearLoanRequestEvents[0].loan.principal)
      : 0;
  const highestTotalBorrow =
    topTotalBorrowsData?.borrowerStats_collection?.[0]?.maxBorrowedValue
      ? Number(topTotalBorrowsData.borrowerStats_collection[0].maxBorrowedValue)
      : 0;

  const cards = [
    {
      label: "Total Borrowers",
      value: totalBorrowers.toLocaleString(),
      sub: "unique addresses",
    },
    {
      label: "Active Loopers",
      value: activeLoopers.toLocaleString(),
      sub: "current loopers",
    },
    {
      label: "Highest Loop",
      value: highestLoop.toLocaleString(),
      sub: "max by one address",
    },
    {
      label: "All Individual Loans",
      value: totalLoans.toLocaleString(),
      sub: "total loans created",
    },
    {
      label: "Active Loans",
      value: totalActiveLoans.toLocaleString(),
      sub: "currently active",
    },
    {
      label: "Highest Single Borrow",
      value: formatUSD(highestBorrow),
      sub: null,
    },
    {
      label: "Highest Total Borrowed",
      value: formatUSD(highestTotalBorrow),
      sub: null,
    },
    {
      label: "Total Defaults",
      value: totalDefaults.toLocaleString(),
      sub: "loans defaulted",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {cards.map((card) => (
        <Card key={card.label} className="p-6">
          <span className="text-sm text-secondary-t">{card.label}</span>
          <p className="text-2xl font-semibold mt-1">{card.value}</p>
          {card.sub && (
            <span className="text-xs text-tertiary-t">{card.sub}</span>
          )}
        </Card>
      ))}

      {/* Defaulting Soon card with interactive input */}
      <Card className="p-6">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-secondary-t">Defaulting in</span>
          <input
            type="number"
            min={1}
            max={365}
            value={defaultDays}
            onChange={(e) => setDefaultDays(parseInt(e.target.value) || 5)}
            className="w-12 h-6 text-sm text-center bg-surface-a5 border border-a10 rounded px-1"
          />
          <span className="text-sm text-secondary-t">days</span>
        </div>
        <p className="text-2xl font-semibold mt-1">
          {formatUSD(defaultingStats.value)}
        </p>
        <span className="text-xs text-tertiary-t">
          {defaultingStats.count} loan{defaultingStats.count !== 1 ? "s" : ""} will default
        </span>
      </Card>
    </div>
  );
};
