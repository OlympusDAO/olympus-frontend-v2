import { WalletIcon } from "lucide-react";
import { Card } from "@/components/ui/card.tsx";

interface WalletNotConnectedProps {
  description?: string;
}

export function WalletNotConnected({
  description = "Please connect your wallet to see your claim amount",
}: WalletNotConnectedProps) {
  return (
    <Card className="py-14 flex flex-col items-center justify-center gap-4">
      <WalletIcon className="size-8 text-secondary-t" />
      <div className="flex flex-col items-center gap-1">
        <p className="text-[18px]/[24px] font-semibold text-primary-t">Wallet Not Connected</p>
        <p className="text-[15px]/[20px] text-secondary-t">{description}</p>
      </div>
    </Card>
  );
}
