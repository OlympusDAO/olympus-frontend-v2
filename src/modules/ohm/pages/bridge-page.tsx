import { useState, useEffect, useMemo } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { Card } from "@/components/ui/card";
import { BridgeForm } from "../components/bridge-form";
import { BridgeHistory } from "../components/bridge-history";
import { BridgeConfirmModal } from "../components/bridge-confirm-modal";
import { BridgeChainSelectorModal } from "../components/bridge-chain-selector-modal.tsx";
import { BridgeSettingsModal } from "../components/bridge-settings-modal";
import { useEstimateBridgeFee } from "@/lib/hooks/bridge/useEstimateBridgeFee";
import { parseUnits } from "viem";
import {
  BRIDGE_CHAINS,
  BRIDGEABLE_DESTINATIONS,
  DEFAULT_DESTINATION,
  isBridgeableChain,
} from "../utils/constants.ts";

export function BridgePage() {
  const { address } = useAccount();
  const walletChainId = useChainId();
  const { switchChain } = useSwitchChain();

  // Core state
  const [sourceChainId, setSourceChainId] = useState(() =>
    isBridgeableChain(walletChainId) ? walletChainId : 1,
  );
  const [destinationChainId, setDestinationChainId] = useState(
    () => DEFAULT_DESTINATION[sourceChainId] ?? 42161,
  );
  const [amount, setAmount] = useState("");
  const [recipientAddress, setRecipientAddress] = useState<string>("");

  // Modal state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [isDestModalOpen, setIsDestModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Keep recipient in sync with connected wallet
  useEffect(() => {
    if (address && !recipientAddress) {
      setRecipientAddress(address);
    }
  }, [address, recipientAddress]);

  // Sync source chain with wallet network changes
  useEffect(() => {
    if (isBridgeableChain(walletChainId) && walletChainId !== sourceChainId) {
      setSourceChainId(walletChainId);
      const validDests = BRIDGEABLE_DESTINATIONS[walletChainId] ?? [];
      if (!validDests.includes(destinationChainId)) {
        setDestinationChainId(DEFAULT_DESTINATION[walletChainId] ?? validDests[0]);
      }
    }
  }, [walletChainId]);

  // Available destination chains for current source
  const availableDestChains = useMemo(() => {
    const destIds = BRIDGEABLE_DESTINATIONS[sourceChainId] ?? [];
    return BRIDGE_CHAINS.filter((c) => destIds.includes(c.chainId));
  }, [sourceChainId]);

  // Parse amount for fee estimate and allowance check
  const amountBigInt = useMemo(() => {
    try {
      return amount ? parseUnits(amount, 9) : 0n;
    } catch {
      return 0n;
    }
  }, [amount]);

  // Fee estimate (for passing to confirm modal)
  const { nativeFee } = useEstimateBridgeFee({
    sourceChainId,
    destinationChainId,
    recipientAddress: recipientAddress as `0x${string}`,
    amount: amountBigInt,
  });

  const handleSourceChainSelect = (chainId: number) => {
    if (chainId !== sourceChainId) {
      setSourceChainId(chainId);
      switchChain({ chainId });

      // Update destination if current one isn't valid
      const validDests = BRIDGEABLE_DESTINATIONS[chainId] ?? [];
      if (!validDests.includes(destinationChainId)) {
        setDestinationChainId(DEFAULT_DESTINATION[chainId] ?? validDests[0]);
      }
    }
  };

  const handleDestChainSelect = (chainId: number) => {
    setDestinationChainId(chainId);
  };

  const handleSwapChains = () => {
    const newSource = destinationChainId;
    const newDest = sourceChainId;
    const validDests = BRIDGEABLE_DESTINATIONS[newSource] ?? [];
    if (validDests.includes(newDest)) {
      setSourceChainId(newSource);
      setDestinationChainId(newDest);
      switchChain({ chainId: newSource });
    }
  };

  const handleSubmit = () => {
    if (amount && parseFloat(amount) > 0) {
      setIsConfirmOpen(true);
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-8">
        <Card className="p-6 h-fit">
          <BridgeForm
            sourceChainId={sourceChainId}
            destinationChainId={destinationChainId}
            amount={amount}
            recipientAddress={recipientAddress as `0x${string}`}
            onAmountChange={setAmount}
            onOpenSourceChainModal={() => setIsSourceModalOpen(true)}
            onOpenDestChainModal={() => setIsDestModalOpen(true)}
            onOpenSettingsModal={() => setIsSettingsOpen(true)}
            onSwapChains={handleSwapChains}
            onSubmit={handleSubmit}
          />
        </Card>
        <BridgeHistory />
      </div>

      {/* Source Chain Selector */}
      <BridgeChainSelectorModal
        isOpen={isSourceModalOpen}
        onClose={() => setIsSourceModalOpen(false)}
        title="Select Source Chain"
        chains={BRIDGE_CHAINS}
        selectedChainId={sourceChainId}
        onSelect={handleSourceChainSelect}
      />

      {/* Destination Chain Selector */}
      <BridgeChainSelectorModal
        isOpen={isDestModalOpen}
        onClose={() => setIsDestModalOpen(false)}
        title="Select Target Chain"
        chains={availableDestChains}
        selectedChainId={destinationChainId}
        onSelect={handleDestChainSelect}
      />

      {/* Settings Modal */}
      <BridgeSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        recipientAddress={recipientAddress}
        onRecipientChange={setRecipientAddress}
      />

      {/* Confirm Modal */}
      {isConfirmOpen && nativeFee && (
        <BridgeConfirmModal
          isOpen={isConfirmOpen}
          onClose={() => {
            setIsConfirmOpen(false);
            setAmount("");
          }}
          sourceChainId={sourceChainId}
          destinationChainId={destinationChainId}
          amount={amount}
          recipientAddress={recipientAddress as `0x${string}`}
          nativeFee={nativeFee}
        />
      )}
    </div>
  );
}
