import type React from "react";
import { ProtocolOverview } from "../components/protocol-overview";
import { VersionComparison } from "../components/version-comparison";
import { ProtocolUtilizationChart } from "../components/protocol-utilization-chart";
import { V2HistoricalCharts } from "../components/v2-historical-charts";
import { V1StatsCards } from "../components/v1-stats-cards";
import { LoanMaturityChart } from "../components/loan-maturity-chart";
import { V1UtilizationChart } from "../components/v1-utilization-chart";
import { ProtocolIncomeChart } from "../components/protocol-income-chart";

export const CoolerMetricsPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-6">
      <ProtocolOverview />
      <VersionComparison />
      <ProtocolUtilizationChart />
      <V2HistoricalCharts />
      <V1StatsCards />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LoanMaturityChart />
        <V1UtilizationChart />
      </div>
      <ProtocolIncomeChart />
    </div>
  );
};
