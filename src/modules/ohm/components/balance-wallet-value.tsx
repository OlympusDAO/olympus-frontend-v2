import { Skeleton } from "@/components/ui/skeleton";
import { NumberFlow } from "@/components/ui/number-flow.tsx";
import { Wallet } from "lucide-react";

type WalletValueProps = {
  totalUsd: number;
  isLoading: boolean;
};

export function BalanceWalletValue({ totalUsd, isLoading }: WalletValueProps) {
  return (
    <div className="flex items-center gap-x-2 mb-3">
      <Wallet className="size-5" />
      <span className="text-[20px]/[24px] font-semibold">In Wallet</span>
      <span className="text-tertiary-t">·</span>
      {isLoading ? (
        <Skeleton className="h-7 w-32" />
      ) : (
        <NumberFlow
          className=" text-[20px]/[24px] font-semibold"
          format={{ notation: "standard" }}
          value={totalUsd}
        />
      )}
    </div>
  );
}
