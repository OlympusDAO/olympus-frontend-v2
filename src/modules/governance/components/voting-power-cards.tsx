import { useAccount } from "wagmi";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useVotingWeight } from "@/modules/governance/hooks/useVotingWeight";
import { useCheckDelegation } from "@/modules/governance/hooks/useCheckDelegation";

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Two stat cards showing the connected wallet's voting power and delegation status.
 * Only renders when a wallet is connected.
 */
export function VotingPowerCards({ startBlock }: { startBlock?: number }) {
  const { address, isConnected } = useAccount();
  const { data: votingWeight, isLoading: weightLoading } = useVotingWeight({ startBlock });
  const { data: delegatee, isLoading: delegationLoading } = useCheckDelegation({ address });

  if (!isConnected) return null;

  const formattedWeight = votingWeight
    ? Number(votingWeight).toLocaleString(undefined, { maximumFractionDigits: 4 })
    : "0";

  const isDelegated = !!delegatee && delegatee.toLowerCase() !== address?.toLowerCase();

  return (
    <div data-slot="voting-power-cards" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Card className="p-5">
        <div className="flex flex-col gap-2">
          <span className="text-xs text-secondary-t font-medium uppercase tracking-wide">
            My Voting Power
          </span>
          {weightLoading ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-semibold text-primary-t">{formattedWeight}</span>
              <span className="text-sm text-secondary-t">gOHM</span>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-col gap-2">
          <span className="text-xs text-secondary-t font-medium uppercase tracking-wide">
            Delegated Voting Power
          </span>
          {delegationLoading ? (
            <Skeleton className="h-8 w-32" />
          ) : isDelegated ? (
            <div className="flex flex-col gap-1">
              <span className="text-sm text-secondary-t">
                Delegated to{" "}
                <span className="text-primary-t font-mono">{shortenAddress(delegatee)}</span>
              </span>
            </div>
          ) : (
            <span className="text-sm text-tertiary-t">Not delegated</span>
          )}
        </div>
      </Card>
    </div>
  );
}
