import { RiBook2Line, RiShieldCrossLine } from "@remixicon/react";
import { LottieIcon } from "@/components/lottie-icon";
import type { ComponentType, ReactNode } from "react";

import pulseAnimation from "@/assets/animations/pulse.json";
import ohmAnimation from "@/assets/animations/ohm.json";
import coolerAnimation from "@/assets/animations/cooler.json";
import cdAnimation from "@/assets/animations/cd.json";
import daoAnimation from "@/assets/animations/dao.json";
import engageAnimation from "@/assets/animations/engage.json";

export type NavItem = {
  label: string;
  path: string;
  external?: boolean;
  exact?: boolean;
  requiresMultisig?: boolean;
};

export type AnimatedIconProps = { isHovered: boolean; isActive: boolean };

export type NavSection = {
  id: string;
  label: string;
  sidebarTitle: string;
  icon: ReactNode | ComponentType<AnimatedIconProps>;
  path: string;
  items: NavItem[];
  isNew?: boolean;
  hideNavIfNotMultisig?: boolean;
};

export function isAnimatedIcon(
  icon: ReactNode | ComponentType<AnimatedIconProps>,
): icon is ComponentType<AnimatedIconProps> {
  return typeof icon === "function";
}

function lottieIcon(animationData: unknown): ComponentType<AnimatedIconProps> {
  return ({ isHovered, isActive }) => (
    <LottieIcon animationData={animationData} isHovered={isHovered} isActive={isActive} />
  );
}

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
    label: "Pulse",
    sidebarTitle: "Pulse",
    isNew: true,
    icon: lottieIcon(pulseAnimation),
    path: "/home",
    items: [
      { label: "Overview", path: "/home/overview" },
      { label: "Treasury", path: "/home/treasury" },
      { label: "Protocol", path: "/home/protocol" },
      { label: "Feed", path: "/home/feed" },
    ],
  },
  {
    id: "ohm",
    label: "OHM",
    sidebarTitle: "OHM",
    icon: lottieIcon(ohmAnimation),
    path: "/ohm",
    items: [
      { label: "My Balances", path: "/ohm/balances" },
      { label: "Wrap", path: "/ohm/wrap" },
      { label: "Bridge", path: "/ohm/bridge" },
      { label: "Utility", path: "/ohm/utility" },
    ],
  },
  {
    id: "cooler",
    label: "Cooler",
    sidebarTitle: "Cooler Loans",
    icon: lottieIcon(coolerAnimation),
    path: "/cooler",
    items: [
      { label: "Borrow", path: "/cooler/borrow" },
      { label: "Explorer", path: "/cooler/explorer" },
      { label: "Metrics", path: "/cooler/metrics" },
      { label: "Cooler V1", path: "/cooler/v1" },
    ],
  },
  {
    id: "cds",
    label: "CDs",
    sidebarTitle: "Convertible Deposits",
    icon: lottieIcon(cdAnimation),
    path: "/cds",
    items: [
      { label: "Deposit", path: "/cds/deposit" },
      { label: "Borrow", path: "/cds/borrow" },
      { label: "Metrics", path: "/cds/metrics" },
      // { label: "Activity", path: "/cds/activity" },
    ],
  },
  {
    id: "dao",
    label: "DAO",
    sidebarTitle: "Governance",
    icon: lottieIcon(daoAnimation),
    path: "/dao",
    items: [
      { label: "Vote", path: "/dao/vote" },
      { label: "Delegate", path: "/dao/delegate" },
      { label: "Contract Parameters", path: "/dao/contract-parameters" },
      { label: "Forum", path: "https://forum.olympusdao.finance", external: true },
      { label: "Snapshots", path: "https://snapshot.org/#/olympusdao.eth", external: true },
    ],
  },
  {
    id: "engage",
    label: "Engage",
    isNew: true,
    sidebarTitle: "Engage",
    icon: lottieIcon(engageAnimation),
    path: "/engage",
    hideNavIfNotMultisig: true,
    items: [
      { label: "Dashboard", path: "/engage", exact: true },
      { label: "Rewards Manager", path: "/engage/rewards-manager", requiresMultisig: true },
    ],
  },
];

export const BOTTOM_NAV: BottomNavItem[] = [
  {
    id: "docs",
    label: "Docs",
    icon: RiBook2Line,
    href: "https://docs.olympusdao.finance",
  },
  {
    id: "bug-bounty",
    label: "Bug Bounty",
    icon: RiShieldCrossLine,
    href: "https://immunefi.com/bug-bounty/olympus/",
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
