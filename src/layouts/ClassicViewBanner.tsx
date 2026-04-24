import { useState } from "react";
import { RiBrushLine } from "@remixicon/react";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator.tsx";
import { trackSwitchToClassic, trackDismissClassicBanner } from "@/lib/analytics";

const COOKIE_KEY = "olympus-classic-view-banner-dismissed";

function isBannerDismissed(): boolean {
  return document.cookie.split("; ").some((c) => c.startsWith(`${COOKIE_KEY}=`));
}

function setBannerCookie(switched: boolean) {
  const expires = new Date("2026-06-02").toUTCString();
  document.cookie = `${COOKIE_KEY}=${switched}; path=/; expires=${expires}; SameSite=Lax`;
}

interface ClassicViewBannerProps {
  deadline?: string;
}

export function ClassicViewBanner({ deadline = "June 1" }: ClassicViewBannerProps) {
  const [dismissed, setDismissed] = useState(() => isBannerDismissed());

  if (dismissed) return null;

  const handleDismiss = () => {
    setBannerCookie(false);
    setDismissed(true);
    trackDismissClassicBanner();
  };

  const handleSwitch = () => {
    setBannerCookie(true);
    setDismissed(true);
    trackSwitchToClassic();
  };

  return (
    <>
      <div className="flex items-center justify-between pl-6 pr-5 py-1.5 shrink-0">
        {/* Left: icon + text */}
        <div className="flex items-center gap-1">
          <RiBrushLine className="size-4 text-primary-t shrink-0" />
          <span className="text-xs font-semibold text-primary-t">New look!</span>
          <span className="text-xs font-normal text-secondary-t hidden sm:inline-block">
            You can switch back to the classic view until {deadline}
          </span>
        </div>

        {/* Right: switch button + close */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="xs"
            onClick={handleSwitch}
            render={
              <a href="https://old.olympusdao.finance" target="_blank" rel="noopener noreferrer" />
            }
          >
            Switch to Classic View
          </Button>
          <button
            type="button"
            onClick={handleDismiss}
            className="flex items-center justify-center size-5 text-secondary-t hover:text-primary-t transition-colors"
            aria-label="Dismiss"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      </div>
      <Separator />
    </>
  );
}
