import { Skeleton } from "@/components/ui/skeleton";
import { Wallet } from "lucide-react";

type WalletValueProps = {
  totalUsd: number;
  isLoading: boolean;
};

export function WalletValue({ totalUsd, isLoading }: WalletValueProps) {
  return (
    <div className="flex items-center gap-2.5">
      <Wallet className="size-5 text-tertiary-t" />
      <span className="text-secondary-t text-sm">In Wallet</span>
      {isLoading ? (
        <Skeleton className="h-7 w-32" />
      ) : (
        <span className="text-primary-t text-xl font-semibold">
          $
          {totalUsd.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      )}
    </div>
  );
}
