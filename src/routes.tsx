import { createHashRouter, Navigate } from "react-router-dom";
import AppLayout from "@/layouts/AppLayout";
import { StubPage } from "@/pages/stub-page.tsx";
import { BalancesPage } from "@/modules/ohm/pages/balance-page.tsx";
import { CDPage } from "@/modules/cds/pages";
import { BorrowPage } from "@/modules/borrow/pages";
import { StatisticsPage } from "@/modules/statistics/pages";
import { CoolerMetricsPage } from "@/modules/cooler-metrics/pages";
import { CoolerActivityLayout } from "@/modules/cooler-activity/pages";
import { V2ActivityFeed } from "@/modules/cooler-activity/components/v2-activity-feed";
import { AccountsView } from "@/modules/cooler-activity/components/accounts-view";
import { V1ActiveLoansTable } from "@/modules/cooler-activity/components/v1-active-loans-table";
import { V1DefaultedLoansTable } from "@/modules/cooler-activity/components/v1-defaulted-loans-table";
import { LivenessPage } from "@/modules/liveness/pages";
import { WrapPage } from "@/modules/ohm/pages/wrap-page.tsx";
import { UtilityPage } from "@/modules/ohm/pages/utility-page.tsx";

export const router = createHashRouter([
  {
    path: "/",
    Component: AppLayout,
    children: [
      // Redirect root to OHM balances
      { index: true, element: <Navigate to="/ohm/balances" replace /> },

      // Home section
      { path: "home/treasury", element: <StubPage title="Treasury Dashboard" /> },
      { path: "home/feed", element: <StubPage title="Protocol Feed" /> },
      { path: "home/liveness", element: <LivenessPage /> },

      // OHM section
      { path: "ohm/balances", element: <BalancesPage /> },
      { path: "ohm/wrap", element: <WrapPage /> },
      { path: "ohm/utility", element: <UtilityPage /> },
      { path: "ohm/bridge", element: <StubPage title="Bridge OHM" /> },

      // Legacy redirects
      { path: "home/balances", element: <Navigate to="/ohm/balances" replace /> },
      { path: "home/wrap", element: <Navigate to="/ohm/wrap" replace /> },
      { path: "home/bridge", element: <Navigate to="/ohm/bridge" replace /> },
      { path: "home/stake", element: <Navigate to="/ohm/wrap" replace /> },
      { path: "stake", element: <Navigate to="/ohm/wrap" replace /> },
      { path: "wrap", element: <Navigate to="/ohm/wrap" replace /> },

      // Cooler section
      { path: "cooler/borrow", element: <StubPage title="Borrow" /> },
      {
        path: "cooler/activity",
        element: <CoolerActivityLayout />,
        children: [
          { index: true, element: <Navigate to="/cooler/activity/feed" replace /> },
          { path: "feed", element: <V2ActivityFeed /> },
          { path: "accounts", element: <AccountsView /> },
          { path: "active-loans", element: <V1ActiveLoansTable /> },
          { path: "defaulted-loans", element: <V1DefaultedLoansTable /> },
        ],
      },
      { path: "cooler/metrics", element: <CoolerMetricsPage /> },

      // CDs section
      { path: "cds/deposit", element: <CDPage /> },
      { path: "cds/borrow", element: <BorrowPage /> },
      { path: "cds/statistics", element: <StatisticsPage /> },
      { path: "cds/activity", element: <StubPage title="Activity" /> },

      // DAO section
      { path: "dao/vote", element: <StubPage title="Vote" /> },
      { path: "dao/delegate", element: <StubPage title="Delegate" /> },

      // Rewards
      { path: "rewards", element: <StubPage title="Rewards" /> },

      // Catch-all
      { path: "*", element: <Navigate to="/ohm/balances" replace /> },
    ],
  },
]);
