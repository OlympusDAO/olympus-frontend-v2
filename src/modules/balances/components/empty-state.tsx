import { Card } from "@/components/ui/card";
import { Icon } from "@/components/icon";

export function EmptyState({ isLoading }: { isLoading: boolean }) {
  if (isLoading) return null;

  return (
    <Card className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <Icon name="CopperCoinIcon" size={40} className="text-tertiary-t mb-4" />
      <h3 className="text-primary-t font-medium mb-1">You don't have any Olympus tokens yet.</h3>
      <p className="text-tertiary-t text-sm max-w-sm">
        Get OHM to start earning and participating in governance.
      </p>
    </Card>
  );
}
