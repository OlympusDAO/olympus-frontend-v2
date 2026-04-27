import { Card } from "@/components/ui/card";
import { Icon } from "@/components/icon";

export function BalanceEmptyState({ isLoading }: { isLoading: boolean }) {
  if (isLoading) return null;

  return (
    <Card className="flex flex-col items-center justify-center py-16 px-6 text-center min-h-[240px]">
      <Icon name="CopperCoinIcon" size={40} className="text-tertiary-t mb-4" />
      <h3 className="text-sm/5 font-semibold text-secondary-t mb-1">
        You don't have any Olympus tokens yet.
      </h3>
      <p className="text-xs/4 font-normal text-secondary-t max-w-sm">
        Get OHM to start earning and participating in governance.
      </p>
    </Card>
  );
}
