import type React from "react";
import { MetricsProtocolOverview } from "../components/metrics-protocol-overview.tsx";
import { MetricsVersionComparison } from "../components/metrics-version-comparison.tsx";
import { MetricsProtocolUtilizationChart } from "../components/metrics-protocol-utilization-chart.tsx";
import { MetricsV2HistoricalCharts } from "../components/metrics-v2-historical-charts.tsx";
import { MetricsV1StatsCards } from "../components/metrics-v1-stats-cards.tsx";
import { MetricsLoanMaturityChart } from "../components/metrics-loan-maturity-chart.tsx";
import { MetricsV1UtilizationChart } from "../components/metrics-v1-utilization-chart.tsx";
import { ProtocolIncomeChart } from "../components/metrics-protocol-income-chart.tsx";

export const CoolerMetricsPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-6">
      <MetricsProtocolOverview />
      <MetricsVersionComparison />
      <MetricsProtocolUtilizationChart />
      <MetricsV2HistoricalCharts />
      <MetricsV1StatsCards />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetricsLoanMaturityChart />
        <MetricsV1UtilizationChart />
      </div>
      <ProtocolIncomeChart />
    </div>
  );
};
