import { formatTokenAmount } from "@/lib/math";
import { useGasPrice } from "wagmi";
import { Separator } from "@/components/ui/separator.tsx";
import { CircleProgress } from "@/components/ui/progress.tsx";
import { Icon } from "@/components/icon.tsx";
import { cn } from "@/lib/utils";
import { NumberFlow } from "@/components/ui/number-flow.tsx";
import {
  RiCookieLine,
  RiDiscordFill,
  RiMediumFill,
  RiGithubFill,
  RiGasStationLine,
  RiMoonLine,
  RiSunLine,
  RiContrastLine,
  RiTwitterXFill,
  RiQuestionLine,
} from "@remixicon/react";
import { Tooltip } from "@/components/ui/tooltip.tsx";
import { type Theme, useTheme } from "@/components/theme-provider.tsx";
import { COOKIE_PREFERENCES_EVENT } from "@/components/cookie-preferences";
import { useEpochTimer } from "@/lib/hooks/liveness/useEpochTimer";
import type * as React from "react";
import { useToken } from "@/lib/hooks/useToken.tsx";
import { TokenName } from "@/lib/tokens.ts";

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

function CookiePreferencesButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(COOKIE_PREFERENCES_EVENT))}
      className="flex items-center gap-x-1 text-secondary-t hover:text-primary-t transition-colors hover:pointer"
    >
      <RiCookieLine size={16} />
    </button>
  );
}

function SupportButton() {
  const openChat = () => {
    const launcher = document.querySelector<HTMLButtonElement>(
      '#ph-conversations-widget-container button[aria-label="Open chat"]',
    );
    launcher?.click();
  };

  return (
    <button
      type="button"
      onClick={openChat}
      className="flex items-center gap-x-1 text-secondary-t hover:text-primary-t transition-colors"
    >
      <RiQuestionLine className="size-4" />
      <span className="text-[12px] leading-none">Support</span>
    </button>
  );
}

export function Footer() {
  const { theme, setTheme } = useTheme();
  const { hours, minutes, seconds, progress } = useEpochTimer();
  const { data: gasPriceWei } = useGasPrice({ query: { refetchInterval: 15_000 } });
  const GOHMToken = useToken(TokenName.GOHM);
  const OHMToken = useToken(TokenName.OHM);

  const gasPriceGwei = gasPriceWei ? Math.round(formatTokenAmount(gasPriceWei, 9)) : 0;
  const beatLabel = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return (
    <footer className="bg-surface-bg-l1 h-9 shrink-0 z-50">
      <Separator className="w-full" />

      {/* Mobile: two rows (< 650px) */}
      <div className="flex flex-col gap-1 pb-2 px-3 min-[650px]:hidden">
        {/* Row 1: Next Beat + socials */}
        <div className="flex items-center justify-center gap-x-3">
          <div className="flex items-center gap-x-2 w-[160px] shrink-0">
            <CircleProgress size={16} type="success" value={progress} />
            <div className="flex items-center gap-x-1 text-[12px]/[15px] whitespace-nowrap">
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
            <Icon name={OHMToken.icon} className="size-4" />
            <NumberFlow value={OHMToken.price} className="text-[12px]/[16px]" />
          </div>
          <div className="flex items-center gap-x-1">
            <Icon name={GOHMToken.icon} className="size-4" />
            <NumberFlow value={GOHMToken.price} className="text-[12px]/[16px]" />
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
          <div className="flex items-center gap-x-2">
            <ThemeSwitcher theme={theme} setTheme={setTheme} />
            <Separator orientation="vertical" className="h-5 w-px" />
            <CookiePreferencesButton />
            <Separator orientation="vertical" className="h-5 w-px" />
            <SupportButton />
          </div>
        </div>
      </div>

      {/* Desktop: single row (≥ 650px) */}
      <div className="hidden min-[650px]:flex px-6 items-center justify-between w-full h-full">
        <div className="flex items-center">
          <div className="flex items-center gap-x-2 w-[160px] shrink-0">
            <CircleProgress size={16} type="success" value={progress} />
            <div className="flex items-center gap-x-1 text-[12px]/[15px] whitespace-nowrap">
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
            <Icon name={OHMToken.icon} className="size-4" />
            <NumberFlow value={OHMToken.price} className="text-[12px]/[16px]" />
          </div>
          <Separator orientation="vertical" className="h-5 mx-4 w-px" />
          <div className="flex items-center gap-x-1">
            <Icon name={GOHMToken.icon} className="size-4" />
            <NumberFlow value={GOHMToken.price} className="text-[12px]/[16px]" />
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
          <Separator orientation="vertical" className="h-5 mx-4 w-px" />
          <CookiePreferencesButton />
          <Separator orientation="vertical" className="h-5 mx-4 w-px" />
          <SupportButton />
        </div>
      </div>
    </footer>
  );
}
