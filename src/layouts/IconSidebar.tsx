import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowUpRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { OlympusLogo } from "@/components/olympus-logo";
import { Tooltip } from "@/components/ui/tooltip";
import {
  NAV_SECTIONS,
  BOTTOM_NAV,
  getActiveSectionFromPath,
  getDefaultPathForSection,
  isAnimatedIcon,
  type NavSection,
} from "@/lib/navigation";

function IconNavItem({
  section,
  isActive,
  "data-tour": dataTour,
}: {
  section: NavSection;
  isActive: boolean;
  "data-tour"?: string;
}) {
  const to = getDefaultPathForSection(section);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link
      to={to}
      data-tour={dataTour}
      className="group flex flex-col items-center gap-1 px-[7px] pb-3 w-[54px]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={cn(
          "flex items-center justify-center size-10 transition-all",
          isActive
            ? "rounded-full bg-gradient-to-b from-sidebar-tab-fill-top to-sidebar-tab-fill-bottom border-[0.5px] border-sidebar-tab-border"
            : "rounded-full border-[0.5px] border-transparent group-hover:bg-surface-a5 group-hover:border-a3-b",
        )}
      >
        <span
          className={cn(
            "[&>svg]:size-6 [&>svg]:transition-colors",
            isActive ? "text-primary-t" : "text-secondary-t group-hover:text-primary-t",
          )}
        >
          {isAnimatedIcon(section.icon) ? (
            <section.icon isHovered={isHovered} isActive={isActive} />
          ) : (
            section.icon
          )}
        </span>
      </div>
      <span
        className={cn(
          "text-xs font-medium leading-[12px] transition-colors",
          isActive ? "text-primary-t" : "text-secondary-t group-hover:text-primary-t",
        )}
      >
        {section.label}
      </span>
    </Link>
  );
}

export function IconSidebar() {
  const location = useLocation();
  const activeSection = getActiveSectionFromPath(location.pathname);

  return (
    <aside className="shrink-0 flex items-center p-1.5">
      <div
        className="w-16 h-full flex flex-col items-center pb-3 rounded-[100px] bg-sidebar-bg shadow-surface-level-2"
        data-tour="sidebar-nav"
      >
        {/* Logo */}
        <div className="flex items-center justify-center p-4">
          <Link to="/">
            <OlympusLogo className="size-8" />
          </Link>
        </div>

        {/* Main nav items */}
        <nav className="flex-1 flex flex-col items-center pt-2">
          {NAV_SECTIONS.map((section) => (
            <IconNavItem
              key={section.id}
              section={section}
              isActive={activeSection?.id === section.id}
              data-tour={`nav-${section.id}`}
            />
          ))}
        </nav>

        {/* Bottom items */}
        <div className="flex flex-col items-start gap-1">
          {BOTTOM_NAV.map((item) => (
            <Tooltip
              key={item.id}
              title={
                <span className="inline-flex items-center gap-1.5">
                  {item.label}
                  <ArrowUpRightIcon className="size-4 text-secondary-t" />
                </span>
              }
              contentProps={{ side: "right", sideOffset: 8 }}
            >
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-center p-2 rounded-full transition-all hover:bg-surface-a5"
              >
                <item.icon className="size-6 text-secondary-t group-hover:text-primary-t transition-colors" />
              </a>
            </Tooltip>
          ))}
        </div>
      </div>
    </aside>
  );
}
