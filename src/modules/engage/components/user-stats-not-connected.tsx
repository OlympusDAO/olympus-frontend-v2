import { ConnectButton as RainbowConnectButton } from "@rainbow-me/rainbowkit";
import { WalletIcon } from "lucide-react";
import { Card } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Icon } from "@/components/icon.tsx";

export function UserStatsNotConnected() {
  return (
    <Card className="p-6 h-full flex flex-col items-center justify-center gap-4">
      <WalletIcon className="size-8 text-secondary-t" />
      <p className="text-[18px]/[24px] font-semibold text-center">
        Connect wallet to view your stats.
      </p>
      <RainbowConnectButton.Custom>
        {({ openConnectModal }) => (
          <Button onClick={openConnectModal} type="button" size="md">
            <Icon name="WalletIcon" size={16} />
            Connect Wallet
          </Button>
        )}
      </RainbowConnectButton.Custom>
    </Card>
  );
}
