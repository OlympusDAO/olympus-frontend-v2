import { useState, useEffect, useMemo } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { Card } from "@/components/ui/card";
import { BridgeForm } from "../components/bridge-form";
import { BridgeHistory } from "../components/bridge-history";
import { BridgeConfirmModal } from "../components/bridge-confirm-modal";
import { BridgeSafeConfirmModal } from "../components/bridge-safe-confirm-modal";
import { BridgeChainSelectorModal } from "../components/bridge-chain-selector-modal.tsx";
import { BridgeSettingsModal } from "../components/bridge-settings-modal";
import type { Address } from "viem";
import { useBridgeRoutes } from "@/lib/hooks/bridge/useBridgeRoute";
import { useSafeContext } from "@/lib/hooks/bridge/useSafeContext";
import {
  BRIDGE_CHAINS,
  BRIDGEABLE_DESTINATIONS,
  DEFAULT_DESTINATION,
  isBridgeableChain,
} from "../utils/constants.ts";
import { resolveRecipient } from "../utils/recipient.ts";

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
  const [customRecipient, setCustomRecipient] = useState<Address>();
  const recipientAddress = resolveRecipient(customRecipient, address);

  // Modal state
  // Pinned when the modal opens, as the form's route follows the wallet's network.
  const [confirmation, setConfirmation] = useState<{
    sourceChainId: number;
    destinationChainId: number;
    amount: string;
    recipientAddress: Address;
  } | null>(null);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [isDestModalOpen, setIsDestModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // What was being confirmed, and where it was going, belonged to the previous wallet.
  useEffect(() => {
    setConfirmation(null);
    setCustomRecipient(undefined);
  }, [address]);

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

  const destinationRoutes = useBridgeRoutes(sourceChainId);
  const { kind: walletKind } = useSafeContext(sourceChainId);
  const ConfirmModal = walletKind === "safe" ? BridgeSafeConfirmModal : BridgeConfirmModal;

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
    if (amount && parseFloat(amount) > 0 && recipientAddress) {
      setConfirmation({ sourceChainId, destinationChainId, amount, recipientAddress });
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
            recipientAddress={recipientAddress}
            onAmountChange={setAmount}
            onOpenSourceChainModal={() => setIsSourceModalOpen(true)}
            onOpenDestChainModal={() => setIsDestModalOpen(true)}
            onOpenSettingsModal={() => setIsSettingsOpen(true)}
            onSwapChains={handleSwapChains}
            onSwitchNetwork={() => switchChain({ chainId: sourceChainId })}
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
        routeStates={destinationRoutes}
      />

      {/* Settings Modal */}
      <BridgeSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        recipientAddress={recipientAddress ?? ""}
        onRecipientChange={(next) =>
          setCustomRecipient(next?.toLowerCase() === address?.toLowerCase() ? undefined : next)
        }
      />

      {/* Confirm Modal */}
      {confirmation && (
        <ConfirmModal
          isOpen
          onClose={() => {
            setConfirmation(null);
            setAmount("");
          }}
          {...confirmation}
        />
      )}
    </div>
  );
}
