import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { ChainIcon } from "@/components/chain-icon.tsx";
import type { BridgeChain } from "../utils/constants.ts";

interface ChainSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  chains: BridgeChain[];
  selectedChainId: number;
  onSelect: (chainId: number) => void;
}

export function BridgeChainSelectorModal({
  isOpen,
  onClose,
  title,
  chains,
  selectedChainId,
  onSelect,
}: ChainSelectorModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full sm:max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {chains.map((chain) => {
            const isSelected = chain.chainId === selectedChainId;
            return (
              <button
                key={chain.chainId}
                type="button"
                onClick={() => {
                  onSelect(chain.chainId);
                  onClose();
                }}
                className={`flex items-center justify-between rounded-2xl p-4 transition-colors cursor-pointer ${
                  isSelected ? "bg-surface-a5 hover:bg-surface-a10" : "hover:bg-surface-a5"
                }`}
              >
                <div className="flex items-center gap-x-2">
                  <ChainIcon chainId={chain.chainId} size={24} />
                  <span className="text-[15px]/[20px] font-semibold text-primary-t">
                    {chain.name}
                  </span>
                </div>
                <Checkbox checked={isSelected} />
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
