import { Link, useLocation } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { useAccount, useChainId } from "wagmi";
import { cn } from "@/lib/utils";
import { getActiveSectionFromPath, type NavItem } from "@/lib/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { useGETAdminMultisigMembers, type LibChainId } from "@/generated/olympusUnits";

function useMultisigOwnership(enabled: boolean) {
  const { address } = useAccount();
  const chainId = useChainId() as LibChainId;

  const { data } = useGETAdminMultisigMembers(
    { chainId },
    { query: { enabled: enabled && !!address } },
  );

  if (!address || !data) return false;
  return data.owners.some((o) => o.toLowerCase() === address.toLowerCase());
}

function SubNavItem({ item, isActive }: { item: NavItem; isActive: boolean }) {
  if (item.external) {
    return (
      <a
        href={item.path}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-surface-a5 text-secondary-t hover:text-primary-t"
      >
        <span>{item.label}</span>
        <ExternalLink className="size-3.5 text-tertiary-t" />
      </a>
    );
  }

  return (
    <Link
      to={item.path}
      className={cn(
        "flex items-center px-3 py-2 rounded-lg text-sm transition-colors",
        isActive
          ? "bg-surface-a10 text-primary-t font-medium"
          : "font-medium text-secondary-t hover:bg-surface-a5 hover:text-primary-t",
      )}
    >
      {item.label}
    </Link>
  );
}

export function SubNav() {
  const location = useLocation();
  const activeSection = getActiveSectionFromPath(location.pathname);
  const { isAuthenticated } = useAuth();

  const hasMultisigItems = activeSection?.items.some((i) => i.requiresMultisig) ?? false;
  const isMultisigOwner = useMultisigOwnership(isAuthenticated && hasMultisigItems);

  if (!activeSection) return null;

  const visibleItems = activeSection.items.filter(
    (item) => !item.requiresMultisig || isMultisigOwner,
  );

  return (
    <aside className="w-[220px] h-screen flex flex-col border-r border-a10-b shrink-0 bg-surface-bg-l1">
      {/* Section title */}
      <div className="px-5 pt-8 pb-4">
        <h2 className="text-lg font-bold text-primary-t">{activeSection.sidebarTitle}</h2>
      </div>

      {/* Sub-nav items */}
      {visibleItems.length > 0 && (
        <nav className="flex flex-col gap-0.5 px-3">
          {visibleItems.map((item) => (
            <SubNavItem
              key={item.path}
              item={item}
              isActive={
                !item.external &&
                (item.exact
                  ? location.pathname === item.path
                  : location.pathname === item.path ||
                    location.pathname.startsWith(`${item.path}/`))
              }
            />
          ))}
        </nav>
      )}
    </aside>
  );
}
