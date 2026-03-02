import { Home, Gift, FileText, MoreHorizontal, Building2 } from "lucide-react";
import { RiSettings3Line, RiLoopLeftLine } from "@remixicon/react";
import type { ComponentType } from "react";

export type NavItem = {
  label: string;
  path: string;
  external?: boolean;
};

export type NavSection = {
  id: string;
  label: string;
  sidebarTitle: string;
  icon: ComponentType<{ className?: string }>;
  path: string;
  items: NavItem[];
};

type BottomNavItem = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  href?: string;
  action?: string;
};

export const NAV_SECTIONS: NavSection[] = [
  {
    id: "home",
    label: "Home",
    sidebarTitle: "Home",
    icon: Home,
    path: "/home",
    items: [
      { label: "My Balances", path: "/home/balances" },
      { label: "Stake OHM", path: "/home/stake" },
      { label: "Bridge OHM", path: "/home/bridge" },
      { label: "Treasury Dashboard", path: "/home/treasury" },
      { label: "Protocol Feed", path: "/home/feed" },
      { label: "Liveness", path: "/home/liveness" },
    ],
  },
  {
    id: "cooler",
    label: "Cooler",
    sidebarTitle: "Cooler Loans",
    icon: RiSettings3Line,
    path: "/cooler",
    items: [
      { label: "Borrow", path: "/cooler/borrow" },
      { label: "Activity", path: "/cooler/activity" },
      { label: "Metrics", path: "/cooler/metrics" },
    ],
  },
  {
    id: "cds",
    label: "CDs",
    sidebarTitle: "Convertible Deposits",
    icon: RiLoopLeftLine,
    path: "/cds",
    items: [
      { label: "Deposit", path: "/cds/deposit" },
      { label: "Borrow", path: "/cds/borrow" },
      { label: "Statistics", path: "/cds/statistics" },
      { label: "Activity", path: "/cds/activity" },
    ],
  },
  {
    id: "dao",
    label: "DAO",
    sidebarTitle: "Governance",
    icon: Building2,
    path: "/dao",
    items: [
      { label: "Vote", path: "/dao/vote" },
      { label: "Delegate", path: "/dao/delegate" },
      { label: "Forum", path: "https://forum.olympusdao.finance", external: true },
      { label: "Snapshots", path: "https://snapshot.org/#/olympusdao.eth", external: true },
    ],
  },
  {
    id: "rewards",
    label: "Rewards",
    sidebarTitle: "Rewards",
    icon: Gift,
    path: "/rewards",
    items: [],
  },
];

export const BOTTOM_NAV: BottomNavItem[] = [
  {
    id: "docs",
    label: "Docs",
    icon: FileText,
    href: "https://docs.olympusdao.finance",
  },
  {
    id: "more",
    label: "More",
    icon: MoreHorizontal,
  },
];

export function getActiveSectionFromPath(pathname: string): NavSection | undefined {
  return NAV_SECTIONS.find((section) => pathname.startsWith(section.path));
}

export function getActiveSubItemFromPath(pathname: string): NavItem | undefined {
  const section = getActiveSectionFromPath(pathname);
  if (!section) return undefined;
  return section.items.find(
    (item) => !item.external && (pathname === item.path || pathname.startsWith(`${item.path}/`)),
  );
}

export function getDefaultPathForSection(section: NavSection): string {
  const firstInternalItem = section.items.find((item) => !item.external);
  return firstInternalItem?.path ?? section.path;
}
