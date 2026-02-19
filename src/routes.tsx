import { createHashRouter, Navigate } from "react-router-dom";
import AppLayout from "@/layouts/AppLayout";
import { StubPage } from "@/pages/StubPage";

export const router = createHashRouter([
  {
    path: "/",
    Component: AppLayout,
    children: [
      // Redirect root to home/balances
      { index: true, element: <Navigate to="/home/balances" replace /> },

      // Home section
      { path: "home/balances", element: <StubPage title="My Balances" /> },
      { path: "home/stake", element: <StubPage title="Stake OHM" /> },
      { path: "home/bridge", element: <StubPage title="Bridge OHM" /> },
      { path: "home/treasury", element: <StubPage title="Treasury Dashboard" /> },
      { path: "home/feed", element: <StubPage title="Protocol Feed" /> },

      // Cooler section
      { path: "cooler/borrow", element: <StubPage title="Borrow" /> },
      { path: "cooler/activity", element: <StubPage title="Activity" /> },
      { path: "cooler/metrics", element: <StubPage title="Metrics" /> },

      // CDs section
      { path: "cds/deposit", element: <StubPage title="Deposit" /> },
      { path: "cds/borrow", element: <StubPage title="Borrow" /> },
      { path: "cds/statistics", element: <StubPage title="Statistics" /> },
      { path: "cds/activity", element: <StubPage title="Activity" /> },

      // DAO section
      { path: "dao/vote", element: <StubPage title="Vote" /> },
      { path: "dao/delegate", element: <StubPage title="Delegate" /> },

      // Rewards
      { path: "rewards", element: <StubPage title="Rewards" /> },

      // Catch-all
      { path: "*", element: <Navigate to="/home/balances" replace /> },
    ],
  },
]);
