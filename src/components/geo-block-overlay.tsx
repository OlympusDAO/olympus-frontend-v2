import { FC } from "react";
import { RiEarthLine } from "@remixicon/react";

interface GeoBlockOverlayProps {
  countryCode: string;
}

export const GeoBlockOverlay: FC<GeoBlockOverlayProps> = ({ countryCode }) => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-surface-bg-overlay backdrop-blur-sm">
      <div className="bg-surface-toast mx-4 max-w-md rounded-3xl border border-a10-b p-8 shadow-[var(--shadow-card)] dark:shadow-[var(--shadow-card-dark)]">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red/10">
            <RiEarthLine className="h-8 w-8 text-red" />
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-primary-t">Service Unavailable</h2>
            <p className="text-secondary-t text-sm leading-relaxed">
              We're sorry, but this service is not available in your region ({countryCode}).
              Access is restricted based on your location to comply with local regulations.
            </p>
          </div>

          <div className="bg-surface-a3 w-full rounded-xl border border-a5-b p-4">
            <p className="text-secondary-t text-xs">
              If you believe this is an error or you're using a VPN, please try disabling it and refreshing the page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
