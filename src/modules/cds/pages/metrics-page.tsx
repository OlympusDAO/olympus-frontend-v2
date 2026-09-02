import type React from "react";
import { MetricsUserDepositsChart } from "../components/metrics-user-deposits-chart.tsx";
import { MetricsCumulativeYieldChart } from "../components/metrics-cumulative-yield-chart.tsx";
import { MetricsConversionStats } from "../components/metrics-conversion-stats.tsx";
import { MetricsConversionsChart } from "../components/metrics-conversions-chart.tsx";

export const CDMetricsPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MetricsUserDepositsChart />
        <MetricsCumulativeYieldChart />
      </div>

      <MetricsConversionStats />

      <MetricsConversionsChart />
    </div>
  );
};

export default CDMetricsPage;
