import type React from "react";
import { MetricsUserDepositsChart } from "../components/metrics-user-deposits-chart.tsx";
import { MetricsCumulativeYieldChart } from "../components/metrics-cumulative-yield-chart.tsx";
import { MetricsOhmRepurchasesChart } from "../components/metrics-ohm-repurchases-chart.tsx";
import { MetricsConversionStats } from "../components/metrics-conversion-stats.tsx";

export const CDMetricsPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-6">
      {/* Row 1: User Deposits and Cumulative Yield */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MetricsUserDepositsChart />
        <MetricsCumulativeYieldChart />
      </div>

      {/* Row 2: OHM Repurchases (2/3) and Conversion Stats (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MetricsOhmRepurchasesChart />
        </div>
        <div className="lg:col-span-1">
          <MetricsConversionStats />
        </div>
      </div>
    </div>
  );
};

export default CDMetricsPage;
