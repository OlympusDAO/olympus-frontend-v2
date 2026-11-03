import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { ChainIcon } from "@/components/chain-icon.tsx";
import { ROUTE_UNAVAILABLE_COPY, type RouteState } from "@/lib/hooks/bridge/routeState";
import { cn } from "@/lib/utils";
import type { BridgeChain } from "../utils/constants.ts";

interface ChainSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  chains: BridgeChain[];
  selectedChainId: number;
  onSelect: (chainId: number) => void;
  /** Route state per chain. A chain with no entry is selectable. */
  routeStates?: Record<number, RouteState>;
}

export function BridgeChainSelectorModal({
  isOpen,
  onClose,
  title,
  chains,
  selectedChainId,
  onSelect,
  routeStates,
}: ChainSelectorModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full sm:max-w-sm mx-auto !rounded-3xl !p-0 !gap-0">
        <DialogHeader className="py-5 px-6">
          <DialogTitle className="text-[20px]/[24px] font-semibold">{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-1 px-2 pb-2">
          {chains.map((chain) => {
            const isSelected = chain.chainId === selectedChainId;
            const route = routeStates?.[chain.chainId];
            const unavailable = route?.status === "unavailable";
            return (
              <button
                key={chain.chainId}
                type="button"
                disabled={unavailable}
                onClick={() => {
                  onSelect(chain.chainId);
                  onClose();
                }}
                className={cn(
                  "flex items-center justify-between rounded-2xl p-4 transition-colors cursor-pointer",
                  isSelected ? "bg-surface-a5 hover:bg-surface-a10" : "hover:bg-surface-a5",
                  unavailable && "cursor-not-allowed opacity-60 hover:bg-transparent",
                )}
              >
                <div className="flex items-center gap-x-2">
                  <ChainIcon chainId={chain.chainId} size={24} />
                  <div className="flex flex-col items-start">
                    <span className="text-[15px]/[20px] font-semibold text-primary-t">
                      {chain.name}
                    </span>
                    {unavailable && (
                      <span className="text-xs text-secondary-t font-normal">
                        {ROUTE_UNAVAILABLE_COPY[route.reason]}
                      </span>
                    )}
                  </div>
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
