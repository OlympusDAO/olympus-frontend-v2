import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { StatsBar } from "../components/stats-bar";
import { BorrowForm } from "../components/borrow-form";
import { RepayForm } from "../components/repay-form";
import { PositionInfo } from "../components/position-info";
import { useMonoCoolerPosition } from "@/lib/hooks/cooler/useMonoCoolerPosition";
import { useMonoCoolerCalculations } from "@/lib/hooks/cooler/useMonoCoolerCalculations";
type Tab = "borrow" | "repay";

export function CoolerBorrowPage() {
  const [activeTab, setActiveTab] = useState<Tab>("borrow");
  const { position } = useMonoCoolerPosition();

  const loan = useMemo(() => {
    if (!position || (position.collateral === 0n && position.currentDebt === 0n)) return undefined;
    return {
      debt: position.currentDebt,
      collateral: position.collateral,
    };
  }, [position]);

  const isRepayMode = activeTab === "repay";

  const {
    projectedCollateral,
    projectedDebt,
    liquidationThreshold,
    additionalBorrowingAvailable,
    maxPotentialBorrowAmount,
    currentDebt,
  } = useMonoCoolerCalculations({ loan, isRepayMode });

  return (
    <div data-slot="cooler-borrow-page" className="space-y-6">
      <h2 className="text-xl font-semibold">Cooler Loans V2</h2>

      <StatsBar />

      {position?.borrowsPaused && (
        <Card className="p-6">
          <div className="text-center py-4">
            <p className="text-secondary-t font-medium">Borrowing is currently paused.</p>
            <p className="text-tertiary-t mt-1 text-sm">
              New borrows are temporarily disabled. You can still repay existing loans.
            </p>
          </div>
        </Card>
      )}

      <div className="flex gap-6">
        <button
          type="button"
          className={`text-2xl font-semibold transition-colors ${
            activeTab === "borrow" ? "text-primary-t" : "text-disabled-t hover:text-secondary-t"
          }`}
          onClick={() => setActiveTab("borrow")}
        >
          Borrow
        </button>
        <button
          type="button"
          className={`text-2xl font-semibold transition-colors ${
            activeTab === "repay" ? "text-primary-t" : "text-disabled-t hover:text-secondary-t"
          }`}
          onClick={() => setActiveTab("repay")}
        >
          Repay
        </button>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {activeTab === "borrow" ? <BorrowForm loan={loan} /> : <RepayForm loan={loan} />}

          <PositionInfo
            projectedCollateral={projectedCollateral}
            projectedDebt={projectedDebt}
            liquidationThreshold={liquidationThreshold}
            additionalBorrowingAvailable={additionalBorrowingAvailable}
            maxPotentialBorrowAmount={maxPotentialBorrowAmount}
            currentDebt={currentDebt}
            isRepayMode={isRepayMode}
          />
        </div>
      </Card>
    </div>
  );
}
