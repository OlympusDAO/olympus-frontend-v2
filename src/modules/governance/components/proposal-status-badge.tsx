import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { ProposalStatus } from "@/modules/governance/helpers/proposal-status";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      color: {
        green: "bg-green-500/20 text-green-400",
        yellow: "bg-yellow-500/20 text-yellow-400",
        red: "bg-red-500/20 text-red-400",
        blue: "bg-blue-500/20 text-blue-400",
        gray: "bg-gray-500/20 text-gray-400",
      },
    },
    defaultVariants: {
      color: "gray",
    },
  },
);

function getStatusVariant(status: ProposalStatus): VariantProps<typeof badgeVariants>["color"] {
  switch (status) {
    case "Active":
    case "Succeeded":
    case "Executed":
      return "green";
    case "Pending":
      return "yellow";
    case "Canceled":
    case "Defeated":
    case "Vetoed":
    case "Emergency":
      return "red";
    case "Queued":
      return "blue";
    case "Expired":
      return "gray";
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
