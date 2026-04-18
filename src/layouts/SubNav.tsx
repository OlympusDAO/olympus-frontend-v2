import { useLocation } from "react-router-dom";
import { useAccount, useChainId } from "wagmi";
import { getActiveSectionFromPath } from "@/lib/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { useGETAdminMultisigMembers, type LibChainId } from "@/generated/olympusUnits";
import { SubNavItem } from "@/layouts/sub-nav-item";

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

export function SubNav() {
  const location = useLocation();
  const activeSection = getActiveSectionFromPath(location.pathname);
  const hasMultisigItems = activeSection?.items.some((i) => i.requiresMultisig) ?? false;
  const { isAuthenticated } = useAuth({ enabled: hasMultisigItems });
  const isMultisigOwner = useMultisigOwnership(isAuthenticated && hasMultisigItems);

  if (!activeSection) return null;
  if (activeSection.hideNavIfNotMultisig && !isMultisigOwner) return null;

  const visibleItems = activeSection.items.filter(
    (item) => !item.requiresMultisig || isMultisigOwner,
  );

  return (
    <aside className="w-60 h-full flex flex-col shrink-0 bg-surface-bg-l1 relative after:absolute after:right-0 after:top-2 after:bottom-0 after:w-px after:bg-[linear-gradient(180deg,transparent_0%,var(--surface-a10)_10%,var(--surface-a10)_90%,transparent_100%)]">
      {/* Section title */}
      <div className="px-7 pt-5 pb-5 mt-1.5">
        <h2 className="text-xl/6 font-semibold text-primary-t">{activeSection.sidebarTitle}</h2>
      </div>

      {/* Sub-nav items */}
      {visibleItems.length > 0 && (
        <nav className="flex flex-col gap-1 px-3 mt-2">
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
