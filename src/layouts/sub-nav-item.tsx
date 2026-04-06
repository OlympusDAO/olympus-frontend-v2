import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/navigation";

export function SubNavItem({
  item,
  isActive,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  onClick?: () => void;
}) {
  if (item.external) {
    return (
      <a
        href={item.path}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className="flex items-center justify-between pl-4 pr-3 py-2.5 rounded-full text-base font-medium leading-5 transition-colors text-secondary-t hover:bg-surface-a3 hover:text-primary-t"
      >
        <span>{item.label}</span>
        <ExternalLink className="size-3.5 text-tertiary-t" />
      </a>
    );
  }

  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={cn(
        "flex items-center pl-4 pr-3 py-2.5 rounded-full text-base leading-5 transition-colors",
        isActive
          ? "bg-surface-a5 ring-[0.5px] ring-inset ring-surface-a10 text-primary-t font-medium"
          : "font-medium text-secondary-t hover:bg-surface-a3 hover:text-primary-t",
      )}
    >
      {item.label}
    </Link>
  );
}
