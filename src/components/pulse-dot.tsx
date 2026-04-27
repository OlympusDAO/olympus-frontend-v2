import { cn } from "@/lib/utils";

type PulseDotVariant = "green" | "red" | "yellow" | "disabled";

const variantStyles: Record<
  PulseDotVariant,
  { dot: string; ring1: string; ring2: string; pulse: boolean }
> = {
  green: {
    dot: "bg-green",
    ring1: "bg-green/40",
    ring2: "bg-green/20",
    pulse: true,
  },
  red: {
    dot: "bg-red",
    ring1: "bg-red/40",
    ring2: "bg-red/20",
    pulse: true,
  },
  yellow: {
    dot: "bg-yellow",
    ring1: "bg-yellow/40",
    ring2: "bg-yellow/20",
    pulse: true,
  },
  disabled: {
    dot: "bg-disabled-t",
    ring1: "bg-surface-a5",
    ring2: "bg-surface-a3",
    pulse: true,
  },
};

interface PulseDotProps {
  variant?: PulseDotVariant;
  className?: string;
}

export function PulseDot({ variant = "green", className }: PulseDotProps) {
  const styles = variantStyles[variant];

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <div className={cn("size-2 rounded-full", styles.dot)} />
      {styles.pulse && (
        <>
          <div
            className={cn("absolute size-2 rounded-full animate-heartbeat-ring", styles.ring1)}
          />
          <div
            className={cn(
              "absolute size-2 rounded-full animate-heartbeat-ring-delayed",
              styles.ring2,
            )}
          />
        </>
      )}
    </div>
  );
}
