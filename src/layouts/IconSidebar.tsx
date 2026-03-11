import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { OlympusLogo } from "@/components/olympus-logo";
import { MoreMenu } from "@/components/more-menu";
import {
  NAV_SECTIONS,
  BOTTOM_NAV,
  getActiveSectionFromPath,
  getDefaultPathForSection,
  type NavSection,
} from "@/lib/navigation";

function IconNavItem({ section, isActive }: { section: NavSection; isActive: boolean }) {
  const to = getDefaultPathForSection(section);

  return (
    <Link to={to} className="group flex flex-col items-center gap-1 pb-3 w-16">
      <div
        className={cn(
          "flex items-center justify-center size-10 rounded-full transition-all border-[0.5px] border-transparent",
          !isActive && "group-hover:bg-surface-a5 group-hover:border-a3-b",
        )}
        style={
          isActive
            ? {
                background:
                  "linear-gradient(180deg, rgba(248, 204, 130, 0.4) 0%, rgba(248, 204, 130, 0.1) 100%)",
              }
            : undefined
        }
      >
        <span
          className={cn(
            "[&>svg]:size-6 [&>svg]:transition-colors",
            isActive ? "text-primary-t" : "text-secondary-t group-hover:text-primary-t",
          )}
        >
          {section.icon}
        </span>
      </div>
      <span
        className={cn(
          "text-xs font-semibold leading-[12px] transition-colors",
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

  // Separate the docs link from the "more" menu item
  const docsItem = BOTTOM_NAV.find((item) => item.id === "docs");

  return (
    <aside className="shrink-0 flex items-center py-3 px-3">
      <div
        className="w-[72px] h-full flex flex-col rounded-[100px] bg-surface-a3"
        style={{
          boxShadow:
            "0px 4px 16px rgba(20, 23, 34, 0.05), 0px 0px 0px 0.5px rgba(255, 255, 255, 0.2), inset 1px 1px 2px rgba(255, 255, 255, 0.05)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center pt-6 pb-4">
          <Link to="/">
            <OlympusLogo className="size-7" />
          </Link>
        </div>

        {/* Main nav items */}
        <nav className="flex-1 flex flex-col items-center pt-2">
          {NAV_SECTIONS.map((section) => (
            <IconNavItem
              key={section.id}
              section={section}
              isActive={activeSection?.id === section.id}
            />
          ))}
        </nav>

        {/* Bottom items */}
        <div className="flex flex-col items-center gap-1 pb-6">
          {docsItem && (
            <a
              href={docsItem.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-center size-10 rounded-full transition-all border-[0.5px] border-transparent hover:bg-surface-a5 hover:border-a3-b"
            >
              <docsItem.icon className="size-6 text-secondary-t group-hover:text-primary-t transition-colors" />
            </a>
          )}
          <MoreMenu />
        </div>
      </div>
    </aside>
  );
}
