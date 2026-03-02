import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ConnectButton } from "@/components/connect-button";
import { MobileNav } from "@/layouts/MobileNav";
import { OlympusLogo } from "@/components/olympus-logo";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import { getActiveSectionFromPath, getActiveSubItemFromPath } from "@/lib/navigation";

export function Header() {
  const location = useLocation();
  const { isMobile } = useIsMobile();
  const activeSection = getActiveSectionFromPath(location.pathname);
  const activeItem = getActiveSubItemFromPath(location.pathname);

  const title = activeItem?.label ?? activeSection?.sidebarTitle ?? "Olympus";

  useEffect(() => {
    const parts: string[] = [];
    if (activeItem?.label) parts.push(activeItem.label);
    if (activeSection?.sidebarTitle) parts.push(activeSection.sidebarTitle);
    document.title = parts.length > 0 ? `${parts.join(" - ")} | Olympus` : "Olympus";
  }, [activeItem, activeSection]);

  if (isMobile) {
    return (
      <header className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <MobileNav />
          <OlympusLogo className="size-6" />
        </div>
        <ConnectButton />
      </header>
    );
  }

  return (
    <header className="flex items-center justify-between px-8 py-6">
      <h1 className="text-2xl font-bold text-primary-t">{title}</h1>
      <ConnectButton />
    </header>
  );
}
