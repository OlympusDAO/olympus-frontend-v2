import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Icon } from "@/components/icon.tsx";
import { CheckIcon } from "lucide-react";
import type { BridgeChain } from "../../bridge/constants.ts";

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
                className={`flex items-center justify-between rounded-xl p-4 transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-surface-a10 border border-a10-b"
                    : "bg-surface-a3 border border-a3-b hover:bg-surface-a10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon name={chain.icon} size={24} />
                  <span className="text-[15px]/[20px] font-medium text-primary-t">
                    {chain.name}
                  </span>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded bg-blue flex items-center justify-center">
                    <CheckIcon className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
