import { useEffect, useState } from "react";
import { RiTimerLine } from "@remixicon/react";
import { cn } from "@/lib/utils";

function formatCountdown(targetMs: number): { label: string; tickMs: number } {
  const diff = Math.max(0, targetMs - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return { label: `${days}d ${hours}h`, tickMs: 60_000 };
  if (hours > 0) return { label: `${hours}h ${minutes}m`, tickMs: 60_000 };
  if (minutes > 0) return { label: `${minutes}m ${seconds}s`, tickMs: 1_000 };
  return { label: `${seconds}s`, tickMs: 1_000 };
}

export function VotingStartsIn({
  startDate,
  className,
}: {
  startDate: Date | undefined;
  className?: string;
}) {
  const [label, setLabel] = useState(() =>
    startDate ? formatCountdown(startDate.getTime()).label : "",
  );

  useEffect(() => {
    if (!startDate) return;
    let timeoutId: ReturnType<typeof setTimeout>;
    const update = () => {
      const { label: nextLabel, tickMs } = formatCountdown(startDate.getTime());
      setLabel((prev) => (prev === nextLabel ? prev : nextLabel));
      timeoutId = setTimeout(update, tickMs);
    };
    update();
    return () => clearTimeout(timeoutId);
  }, [startDate]);

  if (!startDate) return null;

  return (
    <div
      data-slot="voting-starts-in"
      className={cn("flex flex-col gap-1 items-end justify-center", className)}
    >
      <span className="text-xs/4 font-normal text-secondary-t text-right whitespace-nowrap">
        Voting starts in
      </span>
      <div className="flex items-center gap-1">
        <RiTimerLine className="size-4 text-secondary-t" />
        <span className="text-sm/5 font-semibold text-primary-t text-right whitespace-nowrap">
          {label}
        </span>
      </div>
    </div>
  );
}
