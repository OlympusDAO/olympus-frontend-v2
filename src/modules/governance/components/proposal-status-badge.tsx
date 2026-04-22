import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { ProposalStatus } from "@/modules/governance/helpers/proposal-status";

export const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs/4 font-semibold whitespace-nowrap",
  {
    variants: {
      color: {
        blue: "bg-blue/20 text-blue",
        orange: "bg-orange/20 text-orange",
        yellow: "bg-yellow/20 text-yellow",
        green: "bg-green/20 text-green",
        teal: "bg-[rgb(69_175_187)]/20 text-[rgb(69_175_187)]",
        red: "bg-red/20 text-red",
        purple: "bg-[rgb(180_98_208)]/20 text-[rgb(180_98_208)]",
        neutral: "bg-surface-a5 text-secondary-t",
      },
    },
    defaultVariants: {
      color: "neutral",
    },
  },
);

function getStatusVariant(status: ProposalStatus): VariantProps<typeof badgeVariants>["color"] {
  switch (status) {
    case "Active":
      return "blue";
    case "Pending":
      return "yellow";
    case "Executed":
      return "green";
    case "Queued":
      return "teal";
    case "Canceled":
    case "Defeated":
    case "Vetoed":
    case "Emergency":
      return "red";
    case "Succeeded":
      return "purple";
    case "Expired":
      return "neutral";
  }
}

export function ProposalStatusBadge({
  status,
  className,
}: {
  status: ProposalStatus;
  className?: string;
}) {
  return (
    <span
      data-slot="proposal-status-badge"
      className={cn(badgeVariants({ color: getStatusVariant(status), className }))}
    >
      {status}
    </span>
  );
}
