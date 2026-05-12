import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BorrowStatsBar } from "../components/borrow-stats-bar.tsx";
import { BorrowForm } from "../components/borrow-form";
import { RepayForm } from "../components/repay-form";
import { BorrowPositionInfo } from "../components/borrow-position-info.tsx";
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

  const calculations = useMonoCoolerCalculations({ loan, isRepayMode });

  return (
    <div data-slot="cooler-borrow-page" className="">
      <BorrowStatsBar />

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

      <Tabs
        variant="primary"
        value={activeTab}
        onValueChange={(val) => val && setActiveTab(val as Tab)}
        className="mt-8"
      >
        <TabsList variant="primary">
          <TabsTrigger variant="primary" value="borrow">
            Borrow
          </TabsTrigger>
          <TabsTrigger variant="primary" value="repay">
            Repay
          </TabsTrigger>
        </TabsList>

        <Card className="p-6">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div>
              <TabsContent variant="primary" value="borrow">
                <BorrowForm calculations={calculations} loan={loan} />
              </TabsContent>
              <TabsContent variant="primary" value="repay">
                <RepayForm calculations={calculations} />
              </TabsContent>
            </div>

            <BorrowPositionInfo
              projectedCollateral={calculations.projectedCollateral}
              projectedDebt={calculations.projectedDebt}
              liquidationThreshold={calculations.liquidationThreshold}
              projectedLiquidationDate={calculations.projectedLiquidationDate}
              availableToBorrow={calculations.remainingBorrowingAvailable}
              currentDebt={calculations.currentDebt}
            />
          </div>
        </Card>
      </Tabs>
    </div>
  );
}
