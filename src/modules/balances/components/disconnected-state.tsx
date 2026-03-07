import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";

export function DisconnectedState() {
  return (
    <Card className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <Icon name="WalletIcon" size={40} className="text-tertiary-t mb-4" />
      <h3 className="text-primary-t font-medium mb-4">Connect wallet to view your balances.</h3>
      <ConnectButton.Custom>
        {({ openConnectModal, mounted }) => (
          <Button onClick={openConnectModal} disabled={!mounted}>
            <Icon name="WalletIcon" size={16} />
            Connect Wallet
          </Button>
        )}
      </ConnectButton.Custom>
    </Card>
  );
}
