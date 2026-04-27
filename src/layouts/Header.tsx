import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ConnectButton } from "@/components/connect-button";
import { MobileNav } from "@/layouts/MobileNav";
import { OlympusLogo } from "@/components/olympus-logo";
import { getActiveSectionFromPath, getActiveSubItemFromPath } from "@/lib/navigation";

export function Header() {
  const location = useLocation();
  const activeSection = getActiveSectionFromPath(location.pathname);
  const activeItem = getActiveSubItemFromPath(location.pathname);

  const title = activeItem?.label ?? activeSection?.sidebarTitle ?? "Olympus";

  useEffect(() => {
    const parts: string[] = [];
    if (activeItem?.label) parts.push(activeItem.label);
    if (activeSection?.sidebarTitle) parts.push(activeSection.sidebarTitle);
    document.title = parts.length > 0 ? `${parts.join(" - ")} | Olympus` : "Olympus";
  }, [activeItem, activeSection]);

  return (
    <>
      <header className="flex md:hidden items-center justify-between px-4 py-4">
        <OlympusLogo className="size-6" />
        <div className="flex items-center gap-2">
          <ConnectButton />
          <MobileNav />
        </div>
      </header>

      <header className="hidden md:flex items-center justify-between px-4 md:px-8 py-3 mt-1.5 mb-2 w-full max-w-(--max-content-width) mx-auto">
        <h1 className="text-2xl/8 font-semibold text-primary-t">{title}</h1>
        <ConnectButton />
      </header>
    </>
  );
}
