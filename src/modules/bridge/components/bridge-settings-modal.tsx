import { useState, useEffect } from "react";
import { isAddress } from "viem";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface BridgeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientAddress: string;
  onRecipientChange: (address: string) => void;
}

export function BridgeSettingsModal({
  isOpen,
  onClose,
  recipientAddress,
  onRecipientChange,
}: BridgeSettingsModalProps) {
  const [localAddress, setLocalAddress] = useState(recipientAddress);
  const [error, setError] = useState("");

  useEffect(() => {
    setLocalAddress(recipientAddress);
    setError("");
  }, [recipientAddress, isOpen]);

  const handleSave = () => {
    if (!localAddress) {
      setError("Please enter an address.");
      return;
    }
    if (!isAddress(localAddress)) {
      setError("Invalid Ethereum address.");
      return;
    }
    onRecipientChange(localAddress);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full sm:max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle>Bridge Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <label className="text-sm font-medium text-secondary-t" htmlFor="recipient-address">
            Recipient Address
          </label>
          <input
            id="recipient-address"
            type="text"
            value={localAddress}
            onChange={(e) => {
              setLocalAddress(e.target.value);
              setError("");
            }}
            placeholder="0x..."
            className="w-full rounded-xl bg-surface-a3 border border-a3-b px-4 py-3 text-sm text-primary-t placeholder:text-disabled-t outline-none focus:border-a10-b transition-colors"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <p className="text-xs text-tertiary-t">
            Send bridged OHM to a different wallet address. Leave as your connected wallet address
            for standard bridging.
          </p>
        </div>

        <Button onClick={handleSave} className="w-full">
          Save
        </Button>
      </DialogContent>
    </Dialog>
  );
}
