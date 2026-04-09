import { formatUnits } from "viem";
import { useGasPrice } from "wagmi";
import { Separator } from "@/components/ui/separator.tsx";
import { CircleProgress } from "@/components/ui/progress.tsx";
import { cn } from "@/lib/utils";
import { NumberFlow } from "@/components/ui/number-flow.tsx";
import {
  RiDiscordFill,
  RiMediumFill,
  RiGithubFill,
  RiGasStationLine,
  RiMoonLine,
  RiSunLine,
  RiContrastLine,
  RiTwitterXFill,
} from "@remixicon/react";
import { Tooltip } from "@/components/ui/tooltip.tsx";
import { type Theme, useTheme } from "@/components/theme-provider.tsx";
import OhmSvg from "@/assets/OHM.svg";
import GohmSvg from "@/assets/gOHM.svg";
import { useEpochTimer } from "@/lib/hooks/liveness/useEpochTimer";
import { useTreasuryMetrics } from "@/modules/pulse/hooks/useTreasuryMetrics";
import { useGohmPrice } from "@/lib/hooks/useGohmPrice";
import type * as React from "react";

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: "system", label: "System", icon: <RiContrastLine className="size-4" /> },
  { value: "light", label: "Light", icon: <RiSunLine className="size-4" /> },
  { value: "dark", label: "Dark", icon: <RiMoonLine className="size-4" /> },
];

const SOCIAL_LINKS = [
  { href: "https://discord.gg/olympusdao", icon: RiDiscordFill, label: "Discord" },
  { href: "https://twitter.com/OlympusDAO", icon: RiTwitterXFill, label: "X" },
  { href: "https://olympusdao.medium.com", icon: RiMediumFill, label: "Medium" },
  { href: "https://github.com/OlympusDAO", icon: RiGithubFill, label: "GitHub" },
];

function ThemeSwitcher({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  return (
    <div className="flex items-center gap-x-0.5">
      {THEME_OPTIONS.map((option) => (
        <Tooltip
          key={option.value}
          title={option.label}
          contentProps={{ side: "top", sideOffset: 4 }}
        >
          <button
            type="button"
            onClick={() => setTheme(option.value)}
            className={cn(
              "flex items-center justify-center size-6 rounded-full transition-colors",
              theme === option.value
                ? "text-primary-t bg-surface-elastic-tab shadow-drop-100"
                : "text-secondary-t hover:text-primary-t hover:bg-surface-a3",
            )}
          >
            {option.icon}
          </button>
        </Tooltip>
      ))}
    </div>
  );
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function Footer() {
  const { theme, setTheme } = useTheme();
  const { hours, minutes, seconds, progress } = useEpochTimer();
  const { data: metrics } = useTreasuryMetrics();
  const { price: gohmPrice } = useGohmPrice();
  const { data: gasPriceWei } = useGasPrice({ query: { refetchInterval: 15_000 } });

  const ohmPrice = metrics?.ohmPrice ?? 0;
  const gasPriceGwei = gasPriceWei ? Math.round(Number(formatUnits(gasPriceWei, 9))) : 0;
  const beatLabel = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return (
    <footer className="bg-surface-bg-l1 h-9 shrink-0 z-50">
      <Separator className="w-full" />

      {/* Mobile: two rows (< 650px) */}
      <div className="flex flex-col gap-1 pb-2 px-3 min-[650px]:hidden">
        {/* Row 1: Next Beat + socials */}
        <div className="flex items-center justify-center gap-x-3">
          <div className="flex items-center gap-x-2 w-[128px]">
            <CircleProgress size={16} type="success" value={progress} />
            <div className="flex items-center gap-x-1 text-[12px]/[15px]">
              <p className="text-secondary-t">Next Beat</p>
              <p>{beatLabel}</p>
            </div>
          </div>
          <Separator orientation="vertical" className="h-5 w-px" />
          <div className="flex items-center gap-x-0.5">
            {SOCIAL_LINKS.map((link) => (
              <Tooltip
                key={link.href}
                title={link.label}
                contentProps={{ side: "top", sideOffset: 4 }}
              >
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center size-7 rounded-full transition-colors hover:bg-surface-a5"
                >
                  <link.icon
                    size={20}
                    className="text-secondary-t transition-colors hover:text-primary-t"
                  />
                </a>
              </Tooltip>
            ))}
          </div>
        </div>
        <Separator />

        {/* Row 2: OHM + gOHM + Gas + Theme */}
        <div className="flex items-center gap-x-2 justify-between">
          <div className="flex items-center gap-x-1">
            <img src={OhmSvg} alt="OHM" className="size-4" />
            <NumberFlow value={ohmPrice} className="text-[12px]/[16px]" />
          </div>
          <div className="flex items-center gap-x-1">
            <img src={GohmSvg} alt="gOHM" className="size-4" />
            <NumberFlow value={gohmPrice} className="text-[12px]/[16px]" />
          </div>
          <div className="flex items-center gap-x-1">
            <RiGasStationLine className="size-4 text-secondary-t" />
            <NumberFlow
              value={gasPriceGwei}
              className="text-[12px]/[16px]"
              format={{ style: "decimal" }}
              suffix="GWEI"
            />
          </div>
          <ThemeSwitcher theme={theme} setTheme={setTheme} />
        </div>
      </div>

      {/* Desktop: single row (≥ 650px) */}
      <div className="hidden min-[650px]:flex px-6 items-center justify-between w-full h-full">
        <div className="flex items-center">
          <div className="flex items-center gap-x-2 w-[128px]">
            <CircleProgress size={16} type="success" value={progress} />
            <div className="flex items-center gap-x-1 text-[12px]/[15px]">
              <p className="text-secondary-t">Next Beat</p>
              <p>{beatLabel}</p>
            </div>
          </div>
          <Separator orientation="vertical" className="h-5 mx-4 w-px" />
          <div className="flex items-center gap-x-0.5">
            {SOCIAL_LINKS.map((link) => (
              <Tooltip
                key={link.href}
                title={link.label}
                contentProps={{ side: "top", sideOffset: 4 }}
              >
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center size-7 rounded-full transition-colors hover:bg-surface-a5"
                >
                  <link.icon
                    size={20}
                    className="text-secondary-t transition-colors hover:text-primary-t"
                  />
                </a>
              </Tooltip>
            ))}
          </div>
        </div>
        <div className="flex items-center">
          <div className="flex items-center gap-x-1">
            <img src={OhmSvg} alt="OHM" className="size-4" />
            <NumberFlow value={ohmPrice} className="text-[12px]/[16px]" />
          </div>
          <Separator orientation="vertical" className="h-5 mx-4 w-px" />
          <div className="flex items-center gap-x-1">
            <img src={GohmSvg} alt="gOHM" className="size-4" />
            <NumberFlow value={gohmPrice} className="text-[12px]/[16px]" />
          </div>
          <Separator orientation="vertical" className="h-5 mx-4 w-px" />
          <div className="flex items-center gap-x-1">
            <RiGasStationLine className="size-4 text-secondary-t" />
            <NumberFlow
              value={gasPriceGwei}
              className="text-[12px]/[16px]"
              format={{ style: "decimal" }}
              suffix="GWEI"
            />
          </div>
          <Separator orientation="vertical" className="h-5 mx-4 w-px" />
          <ThemeSwitcher theme={theme} setTheme={setTheme} />
        </div>
      </div>
    </footer>
  );
}
