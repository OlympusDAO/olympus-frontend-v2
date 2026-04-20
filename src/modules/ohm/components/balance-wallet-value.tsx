import { RiWalletLine } from "@remixicon/react";
import { Skeleton } from "@/components/ui/skeleton";
import { NumberFlow } from "@/components/ui/number-flow.tsx";

type WalletValueProps = {
  totalUsd: number;
  isLoading: boolean;
};

export function BalanceWalletValue({ totalUsd, isLoading }: WalletValueProps) {
  return (
    <div className="flex items-center gap-x-2 mb-3">
      <RiWalletLine size={24} />
      <span className="text-[20px]/[24px] font-semibold">In Wallet:</span>
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
