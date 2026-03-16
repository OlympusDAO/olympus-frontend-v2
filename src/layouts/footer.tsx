import { Separator } from "@/components/ui/separator.tsx";
import { CircleProgress } from "@/components/ui/progress.tsx";
import { Segmented } from "@/components/ui/tabs.tsx";
import { NumberFlow } from "@/components/ui/number-flow.tsx";
import {
  RiDiscordFill,
  RiMediumFill,
  RiGithubFill,
  RiGasStationLine,
  RiMoonFill,
  RiSunFill,
  RiContrastFill,
  RiTwitterXFill,
} from "@remixicon/react";
import { Icon } from "@/components/icon.tsx";
import { type Theme, useTheme } from "@/components/theme-provider.tsx";
import type * as React from "react";

const THEME_OPTIONS: { value: Theme; label: React.ReactNode }[] = [
  { value: "system", label: <RiContrastFill /> },
  { value: "light", label: <RiSunFill /> },
  { value: "dark", label: <RiMoonFill /> },
];

const SOCIAL_LINKS = [
  { href: "https://discord.gg/olympusdao", icon: RiDiscordFill, label: "Discord" },
  { href: "https://twitter.com/OlympusDAO", icon: RiTwitterXFill, label: "X" },
  { href: "https://olympusdao.medium.com", icon: RiMediumFill, label: "Medium" },
  { href: "https://github.com/OlympusDAO", icon: RiGithubFill, label: "GitHub" },
];

export function Footer() {
  const { theme, setTheme } = useTheme();
  return (
    <footer className="bg-surface-bg-l1 sticky bottom-0 right-0 left-0 z-50">
      <Separator className="mb-1 w-full" />

      {/* Mobile: two rows (< 650px) */}
      <div className="flex flex-col gap-1 pb-2 px-3 min-[650px]:hidden">
        {/* Row 1: Next Beat + socials */}
        <div className="flex items-center justify-center gap-x-3">
          <div className="flex items-center gap-x-2">
            <CircleProgress size={20} type="success" value={20} />
            <div className="flex items-center gap-x-1 text-[12px]/[15px]">
              <p className="text-secondary-t">Next Beat</p>
              <p>02:10:12</p>
            </div>
          </div>
          <Separator orientation="vertical" className="h-7 w-px" />
          <div className="flex items-center gap-x-1">
            {SOCIAL_LINKS.map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">
                <link.icon size={20} className="text-secondary-t" />
              </a>
            ))}
          </div>
        </div>
        <Separator />

        {/* Row 2: OHM + gOHM + Gas + Theme */}
        <div className="flex items-center gap-x-2 justify-between">
          <div className="flex items-center gap-x-1">
            <Icon name="OHMColorTokenIcon" className="size-4" />
            <NumberFlow value={17.28} className="text-[12px]/[16px]" />
          </div>
          <div className="flex items-center gap-x-1">
            <Icon name="GOHMColorTokenIcon" className="size-4" />
            <NumberFlow value={17.28} className="text-[12px]/[16px]" />
          </div>
          <div className="flex items-center gap-x-1">
            <RiGasStationLine className="size-4 text-secondary-t" />
            <NumberFlow
              value={17.28}
              className="text-[12px]/[16px]"
              format={{ style: "decimal" }}
              suffix="GWEI"
            />
          </div>
          <Segmented size="sm" value={theme} onValueChange={setTheme} options={THEME_OPTIONS} />
        </div>
      </div>

      {/* Desktop: single row (≥ 650px) */}
      <div className="hidden min-[650px]:flex px-6 pb-2 items-center justify-between w-full">
        <div className="flex items-center">
          <div className="flex items-center gap-x-2">
            <CircleProgress size={20} type="success" value={20} />
            <div className="flex items-center gap-x-1 text-[12px]/[15px]">
              <p className="text-secondary-t">Next Beat</p>
              <p>02:10:12</p>
            </div>
          </div>
          <Separator orientation="vertical" className="h-7 mx-4 w-px" />
          <div className="flex items-center gap-x-1">
            {SOCIAL_LINKS.map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">
                <link.icon size={20} className="text-secondary-t" />
              </a>
            ))}
          </div>
        </div>
        <div className="flex items-center">
          <div className="flex items-center gap-x-1">
            <Icon name="OHMColorTokenIcon" className="size-4" />
            <NumberFlow value={17.28} className="text-[12px]/[16px]" />
          </div>
          <Separator orientation="vertical" className="h-7 mx-4 w-px" />
          <div className="flex items-center gap-x-1">
            <Icon name="GOHMColorTokenIcon" className="size-4" />
            <NumberFlow value={17.28} className="text-[12px]/[16px]" />
          </div>
          <Separator orientation="vertical" className="h-7 mx-4 w-px" />
          <div className="flex items-center gap-x-1">
            <RiGasStationLine className="size-4 text-secondary-t" />
            <NumberFlow
              value={17.28}
              className="text-[12px]/[16px]"
              format={{ style: "decimal" }}
              suffix="GWEI"
            />
          </div>
          <Separator orientation="vertical" className="h-7 mx-4 w-px" />
          <Segmented size="sm" value={theme} onValueChange={setTheme} options={THEME_OPTIONS} />
        </div>
      </div>
    </footer>
  );
}
