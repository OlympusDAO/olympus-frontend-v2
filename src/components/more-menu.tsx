import { MoreHorizontal, ExternalLink } from "lucide-react";
import { RiMoonFill, RiSunFill, RiContrastFill, RiDiscordFill, RiTwitterXFill, RiMediumFill, RiGithubFill } from "@remixicon/react";
import { cn } from "@/lib/utils";
import { useTheme, type Theme } from "@/components/theme-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const THEME_OPTIONS: { value: Theme; icon: typeof RiContrastFill; label: string }[] = [
  { value: "system", icon: RiContrastFill, label: "System" },
  { value: "light", icon: RiSunFill, label: "Light" },
  { value: "dark", icon: RiMoonFill, label: "Dark" },
];

const SOCIAL_LINKS = [
  { href: "https://discord.gg/olympusdao", icon: RiDiscordFill, label: "Discord" },
  { href: "https://twitter.com/OlympusDAO", icon: RiTwitterXFill, label: "X" },
  { href: "https://olympusdao.medium.com", icon: RiMediumFill, label: "Medium" },
  { href: "https://github.com/OlympusDAO", icon: RiGithubFill, label: "GitHub" },
];

export function MoreMenu() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group flex items-center justify-center size-10 rounded-full transition-all border-[0.5px] border-transparent hover:bg-surface-a5 hover:border-a3-b cursor-pointer outline-none">
        <MoreHorizontal className="size-6 text-secondary-t group-hover:text-primary-t transition-colors" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="right"
        align="end"
        sideOffset={12}
        className="w-[200px] p-0 overflow-hidden bg-surface-tooltip border-a10-b rounded-3xl"
      >
        {/* Row 1: Theme picker — 48px */}
        <div className="flex items-center justify-between h-12 pl-4 pr-1">
          <span className="text-[15px] font-semibold text-primary-t">Theme</span>
          <div className="flex items-center gap-0.5 rounded-full p-1 bg-surface-a3 border border-a3-b">
            {THEME_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isActive = theme === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    "flex items-center justify-center size-8 rounded-full transition-colors cursor-pointer",
                    isActive ? "bg-surface-a10 text-primary-t" : "text-secondary-t hover:text-primary-t"
                  )}
                  title={option.label}
                >
                  <Icon className="size-5" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Bug Bounty — 48px */}
        <a
          href="https://immunefi.com/bounty/olympus/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between h-12 px-3 hover:bg-surface-a5 transition-colors border-t border-a10-b"
        >
          <div className="flex items-center gap-2 px-1.5 py-2.5">
            <span className="text-[15px] font-semibold text-primary-t">Bug Bounty</span>
          </div>
          <ExternalLink className="size-5 text-tertiary-t" />
        </a>

        {/* Row 3: Social links — 48px */}
        <div className="flex items-center justify-center h-12 gap-1 px-1 border-t border-a10-b">
          {SOCIAL_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center h-10 rounded-full text-secondary-t hover:text-primary-t transition-colors"
                title={link.label}
              >
                <Icon className="size-5" />
              </a>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
