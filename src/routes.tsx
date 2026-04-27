import { createHashRouter, Navigate } from "react-router-dom";
import AppLayout from "@/layouts/AppLayout";
import { StubPage } from "@/pages/stub-page.tsx";
import { BalancesPage } from "@/modules/ohm/pages/balance-page.tsx";
import { CDPage } from "@/modules/cds/pages/deposit-page.tsx";
import { BorrowPage } from "@/modules/cds/pages/borrow-page.tsx";
import { CDMetricsPage } from "@/modules/cds/pages/metrics-page.tsx";
import { CoolerMetricsPage } from "@/modules/cooler/pages/metrics-page.tsx";
import { CoolerActivityLayout } from "@/modules/cooler/pages/activity-page.tsx";
import { WrapPage } from "@/modules/ohm/pages/wrap-page.tsx";
import { UtilityPage } from "@/modules/ohm/pages/utility-page.tsx";
import { BridgePage } from "@/modules/ohm/pages/bridge-page.tsx";
import { CoolerBorrowPage } from "@/modules/cooler/pages/borrow-page.tsx";
import { CoolerV1Page } from "@/modules/cooler/pages/v1";
import { ProposalsPage } from "@/modules/governance/pages/proposals-page";
import { ProposalPage } from "@/modules/governance/pages/proposal-page";
import { DelegatesPage } from "@/modules/governance/pages/delegates-page";
import { DelegateDetailPage } from "@/modules/governance/pages/delegate-detail-page";
import { ContractParametersPage } from "@/modules/governance/pages/contract-parameters-page";
import { ComingSoon } from "@/modules/engage/components/coming-soon.tsx";
import { RewardsManagerPage } from "@/modules/engage/pages/rewards-manager-page.tsx";
import { OverviewPage } from "@/modules/pulse/pages/overview-page";
import { TreasuryPage } from "@/modules/pulse/pages/treasury-page";
import { ProtocolPage } from "@/modules/pulse/pages/protocol-page.tsx";
import { FeedPage } from "@/modules/pulse/pages/feed-page.tsx";

export const router = createHashRouter([
  {
    path: "/",
    Component: AppLayout,
    children: [
      // Redirect root to Pulse overview
      { index: true, element: <Navigate to="/pulse/overview" replace /> },

      // Pulse section
      { path: "pulse/overview", element: <OverviewPage /> },
      { path: "pulse/treasury", element: <TreasuryPage /> },
      { path: "pulse/protocol", element: <ProtocolPage /> },
      { path: "pulse/feed", element: <FeedPage /> },

      // OHM section
      { path: "ohm/balances", element: <BalancesPage /> },
      { path: "ohm/wrap", element: <WrapPage /> },
      { path: "ohm/utility", element: <UtilityPage /> },
      { path: "ohm/bridge", element: <BridgePage /> },

      // Legacy redirects
      { path: "home/overview", element: <Navigate to="/pulse/overview" replace /> },
      { path: "home/treasury", element: <Navigate to="/pulse/treasury" replace /> },
      { path: "home/protocol", element: <Navigate to="/pulse/protocol" replace /> },
      { path: "home/feed", element: <Navigate to="/pulse/feed" replace /> },
      { path: "home/balances", element: <Navigate to="/ohm/balances" replace /> },
      { path: "home/wrap", element: <Navigate to="/ohm/wrap" replace /> },
      { path: "home/bridge", element: <Navigate to="/ohm/bridge" replace /> },
      { path: "home/stake", element: <Navigate to="/ohm/wrap" replace /> },
      { path: "stake", element: <Navigate to="/ohm/wrap" replace /> },
      { path: "wrap", element: <Navigate to="/ohm/wrap" replace /> },

      // Cooler section
      { path: "cooler/borrow", element: <CoolerBorrowPage /> },
      { path: "cooler/v1", element: <CoolerV1Page /> },
      { path: "cooler/explorer", element: <CoolerActivityLayout /> },
      { path: "cooler/activity", element: <Navigate to="/cooler/explorer" replace /> },
      { path: "cooler/metrics", element: <CoolerMetricsPage /> },

      // CDs section
      { path: "cds/deposit", element: <CDPage /> },
      { path: "cds/borrow", element: <BorrowPage /> },
      { path: "cds/metrics", element: <CDMetricsPage /> },
      { path: "cds/statistics", element: <Navigate to="/cds/metrics" replace /> },
      { path: "cds/activity", element: <StubPage title="Activity" /> },

      // DAO section
      { path: "dao/vote", element: <ProposalsPage /> },
      { path: "dao/vote/:id", element: <ProposalPage /> },
      { path: "dao/delegate", element: <DelegatesPage /> },
      { path: "dao/delegate/:id", element: <DelegateDetailPage /> },
      { path: "dao/contract-parameters", element: <ContractParametersPage /> },

      // Engage
      {
        path: "engage",
        children: [
          { index: true, element: <ComingSoon /> },
          { path: "rewards-manager", element: <RewardsManagerPage /> },
        ],
      },

      // Legacy governance redirects
      { path: "governance", element: <Navigate to="/dao/vote" replace /> },
      { path: "governance/proposals/:id", element: <Navigate to="/dao/vote/:id" replace /> },
      { path: "governance/delegate", element: <Navigate to="/dao/delegate" replace /> },
      { path: "governance/delegate/:id", element: <Navigate to="/dao/delegate/:id" replace /> },

      // Catch-all
      { path: "*", element: <Navigate to="/pulse/overview" replace /> },
    ],
  },
]);
