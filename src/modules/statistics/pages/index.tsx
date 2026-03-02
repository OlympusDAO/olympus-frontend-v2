import type React from "react";
import { UserDepositsChart } from "../components/user-deposits-chart";
import { CumulativeYieldChart } from "../components/cumulative-yield-chart";
import { OhmRepurchasesChart } from "../components/ohm-repurchases-chart";
import { ConversionStats } from "../components/conversion-stats";

export const StatisticsPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-6">
      {/* Row 1: User Deposits and Cumulative Yield */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UserDepositsChart />
        <CumulativeYieldChart />
      </div>

      {/* Row 2: OHM Repurchases (2/3) and Conversion Stats (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <OhmRepurchasesChart />
        </div>
        <div className="lg:col-span-1">
          <ConversionStats />
        </div>
      </div>
    </div>
  );
};

export default StatisticsPage;
