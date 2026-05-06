import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { applyAnalyticsConsent, getStoredConsent, type CookieConsent } from "@/lib/analytics";

export const COOKIE_PREFERENCES_EVENT = "olympus:open-cookie-preferences";

export function CookiePreferences() {
  const [visible, setVisible] = useState(() => getStoredConsent() === null);

  useEffect(() => {
    const handler = () => setVisible(true);
    window.addEventListener(COOKIE_PREFERENCES_EVENT, handler);
    return () => window.removeEventListener(COOKIE_PREFERENCES_EVENT, handler);
  }, []);

  if (!visible) return null;

  const handle = (choice: CookieConsent) => {
    applyAnalyticsConsent(choice);
    setVisible(false);
  };

  return (
    <div className="fixed bottom-[56px] right-4 z-40 rounded-2xl bg-surface-toast p-4 w-[357px]">
      <p className="mb-1 text-base font-semibold">Cookie Preferences</p>
      <p className="text-base text-secondary-t font-normal">
        We use cookies to enhance your user experience, provide personalized content and analyze
        traffic.
      </p>
      <div className="flex items-center gap-x-2 mt-4">
        <Button onClick={() => handle("accept_all")}>Accept All</Button>
        <Button variant="secondary" onClick={() => handle("essential_only")}>
          Essential Only
        </Button>
      </div>
    </div>
  );
}
