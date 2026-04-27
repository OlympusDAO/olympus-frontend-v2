import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { OlympusLogo } from "@/components/olympus-logo";
import {
  NAV_SECTIONS,
  getActiveSectionFromPath,
  getDefaultPathForSection,
  isAnimatedIcon,
  type NavSection,
} from "@/lib/navigation";
import { SubNavItem } from "@/layouts/sub-nav-item";

function MobileSectionItem({
  section,
  isActive,
  onSelect,
}: {
  section: NavSection;
  isActive: boolean;
  onSelect: (section: NavSection) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(section)}
      className={cn(
        "flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl transition-colors w-full cursor-pointer",
        isActive ? "bg-surface-a10" : "hover:bg-surface-a3",
      )}
    >
      <span
        className={cn(
          "[&>svg]:size-5 [&>svg]:transition-colors",
          isActive ? "text-brand-sand-1000" : "text-secondary-t",
        )}
      >
        {isAnimatedIcon(section.icon) ? (
          <section.icon isHovered={false} isActive={isActive} />
        ) : (
          section.icon
        )}
      </span>
      <span
        className={cn(
          "text-[10px] leading-tight transition-colors",
          isActive ? "text-primary-t font-medium" : "text-secondary-t",
        )}
      >
        {section.label}
      </span>
    </button>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const activeSection = getActiveSectionFromPath(location.pathname);
  const [selectedSection, setSelectedSection] = useState<NavSection | null>(null);

  // Use the route-based active section, or the manually selected one
  const displaySection = selectedSection ?? activeSection ?? NAV_SECTIONS[0];

  const handleSectionSelect = (section: NavSection) => {
    setSelectedSection(section);
    // If the section has no sub-items, navigate directly and close
    if (section.items.length === 0) {
      setOpen(false);
      setSelectedSection(null);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedSection(null);
  };

  // Reset selected section when drawer opens
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setSelectedSection(null);
    }
  };

  return (
    <>
      <Button variant="tertiary" size="sm" onClick={() => setOpen(true)}>
        <Menu className="size-5" />
      </Button>

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="left" className="p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-full">
            {/* Left: Icon column */}
            <div className="w-[72px] shrink-0 flex flex-col border-r border-a10-b py-4">
              {/* Logo */}
              <div className="flex items-center justify-center pb-4">
                <Link to="/" onClick={handleClose}>
                  <OlympusLogo className="size-6" />
                </Link>
              </div>

              {/* Section icons */}
              <nav className="flex-1 flex flex-col items-center gap-0.5 px-1.5">
                {NAV_SECTIONS.map((section) => (
                  <MobileSectionItem
                    key={section.id}
                    section={section}
                    isActive={displaySection.id === section.id}
                    onSelect={handleSectionSelect}
                  />
                ))}
              </nav>

              {/* Bottom items */}
              <div className="flex flex-col items-center gap-0.5 px-1.5">
                <a
                  href="https://docs.olympusdao.finance"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleClose}
                  className="flex items-center justify-center p-2 rounded-xl hover:bg-surface-a3 w-full"
                >
                  <FileText className="size-5 text-secondary-t" />
                </a>
              </div>
            </div>

            {/* Right: Sub-nav items */}
            <div className="flex-1 flex flex-col min-w-0 py-4">
              {/* Section title */}
              <div className="px-4 pb-4">
                <h2 className="text-lg font-bold text-primary-t">{displaySection.sidebarTitle}</h2>
              </div>

              {/* Sub-nav links */}
              {displaySection.items.length > 0 ? (
                <nav className="flex flex-col gap-0.5 px-2">
                  {displaySection.items.map((item) => (
                    <SubNavItem
                      key={item.path}
                      item={item}
                      isActive={!item.external && location.pathname === item.path}
                      onClick={handleClose}
                    />
                  ))}
                </nav>
              ) : (
                <div className="px-4">
                  <Link
                    to={getDefaultPathForSection(displaySection)}
                    onClick={handleClose}
                    className="flex items-center pl-4 pr-3 py-2.5 rounded-full text-base leading-5 bg-surface-a5 ring-[0.5px] ring-inset ring-surface-a10 text-primary-t font-medium"
                  >
                    {displaySection.sidebarTitle}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
