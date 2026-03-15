import { useRef } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EpochStatus, MockEpoch } from "./rewards-manager-mock";
import { Button } from "@/components/ui/button.tsx";

const DOT_COLOR: Record<EpochStatus, string> = {
  distributed: "bg-green",
  calculated: "bg-yellow",
  not_submitted: "bg-red",
  active: "bg-surface-a10",
};

interface EpochTabsProps {
  epochs: MockEpoch[];
  selected: number;
  onSelect: (id: number) => void;
}

export function EpochTabs({ epochs, selected, onSelect }: EpochTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: direction === "left" ? -160 : 160, behavior: "smooth" });
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="tertiary" onClick={() => scroll("left")}>
        <ChevronLeftIcon className="size-4" />
      </Button>

      <div
        ref={scrollRef}
        className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1"
      >
        {epochs.map((epoch) => {
          const isActive = epoch.id === selected;
          return (
            <button
              type="button"
              key={epoch.id}
              onClick={() => onSelect(epoch.id)}
              className={cn(
                "flex items-center gap-2 shrink-0 px-4 py-1.5 rounded-full transition-colors",
                isActive
                  ? "bg-surface-a10 font-bold text-primary-t"
                  : "text-secondary-t hover:text-primary-t hover:bg-surface-a5",
              )}
            >
              <span className={cn("size-2 rounded-full shrink-0", DOT_COLOR[epoch.status])} />
              <span className="text-[15px]/[20px] whitespace-nowrap">Epoch {epoch.number}</span>
            </button>
          );
        })}
      </div>

      <Button variant="tertiary" onClick={() => scroll("right")}>
        <ChevronRightIcon className="size-4" />
      </Button>
    </div>
  );
}
