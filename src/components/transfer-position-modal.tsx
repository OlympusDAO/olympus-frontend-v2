import type React from "react";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckIcon, ExternalLink } from "lucide-react";
import { useTransferPosition } from "@/lib/hooks/cds/useTransferPosition";
import { isAddress } from "viem";
import { Link } from "react-router-dom";
import { blockExplorerTxBaseUrl } from "@/lib/helpers";
import { useAccount } from "wagmi";

interface Position {
  positionId: number;
  asset: string;
  periodMonths: number;
  remainingDeposit: bigint;
  conversionPrice: bigint;
  expiry: number;
  displayName: string;
}

interface TransferPositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  position?: Position;
}

export const TransferPositionModal: React.FC<TransferPositionModalProps> = ({
  isOpen,
  onClose,
  position,
}) => {
  const [recipientAddress, setRecipientAddress] = useState("");
  const [addressError, setAddressError] = useState("");
  const { address: userAddress } = useAccount();

  const { transferPosition, isPending: isTransferring, isSuccess, hash } = useTransferPosition();

  const handleTransfer = () => {
    if (!position) return;
    if (!recipientAddress.trim()) {
      setAddressError("Recipient address is required");
      return;
    }
    if (!isAddress(recipientAddress)) {
      setAddressError("Invalid wallet address");
      return;
    }
    if (userAddress && recipientAddress.toLowerCase() === userAddress.toLowerCase()) {
      setAddressError("Cannot transfer to your own wallet address");
      return;
    }

    try {
      transferPosition({
        positionId: position.positionId,
        to: recipientAddress as `0x${string}`,
        queryKey: ["userPositions"],
      });
    } catch (error) {
      console.error("Failed to transfer position:", error);
    }
  };

  const handleAddressChange = (value: string) => {
    setRecipientAddress(value);
    if (addressError) setAddressError("");
  };

  // Helper function to format transaction hash for display
  const formatTxHash = (hash?: `0x${string}`) => {
    if (!hash) return "";
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setRecipientAddress("");
      setAddressError("");
    }
  }, [isOpen]);

  // Show success state
  if (isSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full sm:max-w-md mx-auto p-0 gap-0">
          <div className="px-6 pt-6 pb-6 text-center">
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-green/20 rounded-full flex items-center justify-center">
                <CheckIcon className="h-8 w-8 text-green" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Congrats, all done!</h3>
                <p className="text-sm text-secondary-t mt-2">Your transaction has been executed.</p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckIcon className="h-4 w-4 text-green" />
                  <span className="text-sm font-medium">Transfer Position</span>
                </div>
                {hash && (
                  <Link
                    target="_blank"
                    to={`${blockExplorerTxBaseUrl}/${hash}`}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                  >
                    <span className="text-sm font-mono">{formatTxHash(hash)}</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>

              <Button onClick={onClose} className="w-full mt-4">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Default form view
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full sm:max-w-lg mx-auto p-0 gap-0">
        <DialogHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-4">
          <DialogTitle className="text-xl">Transfer Position</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-6">
          {/* Recipient Address Input */}
          <div className="space-y-2">
            <label
              htmlFor="recipientAddress"
              className="text-sm font-medium text-gray-900 dark:text-gray-100"
            >
              Recipient Wallet Address
            </label>
            <Input
              id="recipientAddress"
              type="text"
              placeholder="0x...123"
              value={recipientAddress}
              onChange={(e) => handleAddressChange(e.target.value)}
              className={addressError ? "border-red-500 focus:ring-red-500" : ""}
            />
            {addressError && <p className="text-sm text-red-600">{addressError}</p>}
          </div>

          {/* Transfer Button */}
          <Button
            onClick={handleTransfer}
            disabled={isTransferring || !recipientAddress.trim() || !position}
            className="w-full"
            size="lg"
          >
            {isTransferring ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Transferring...
              </>
            ) : (
              "Transfer Position"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
