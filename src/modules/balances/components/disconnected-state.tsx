import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";

export function DisconnectedState() {
  return (
    <Card className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <Wallet className="size-10 text-tertiary-t mb-4" />
      <h3 className="text-primary-t font-medium mb-4">Connect wallet to view your balances.</h3>
      <ConnectButton.Custom>
        {({ openConnectModal, mounted }) => (
          <Button onClick={openConnectModal} disabled={!mounted}>
            <Wallet className="size-4" />
            Connect Wallet
          </Button>
        )}
      </ConnectButton.Custom>
    </Card>
  );
}
