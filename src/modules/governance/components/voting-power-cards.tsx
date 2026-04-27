import { useAccount } from "wagmi";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useVotingWeight } from "@/modules/governance/hooks/useVotingWeight";
import { useCheckDelegation } from "@/modules/governance/hooks/useCheckDelegation";
import { shortenAddress } from "@/lib/helpers";
import { GOHMTokenIcon } from "@/icons";

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
      <Card className="py-5 px-6">
        <div className="flex flex-col gap-2">
          <span className="text-sm/5 font-normal text-secondary-t">My Voting Power</span>
          {weightLoading ? (
            <Skeleton className="h-6 w-32" />
          ) : (
            <div className="flex items-center gap-2">
              <GOHMTokenIcon className="size-6" />
              <div className="flex items-baseline gap-1">
                <span className="text-xl/6 font-semibold text-primary-t">{formattedWeight}</span>
                <span className="text-xl/6 font-semibold text-primary-t">gOHM</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card className="py-5 px-6">
        <div className="flex flex-col gap-2">
          <span className="text-sm/5 font-normal text-secondary-t">Delegated Voting Power</span>
          {delegationLoading ? (
            <Skeleton className="h-6 w-32" />
          ) : isDelegated ? (
            <div className="flex items-center gap-2">
              <GOHMTokenIcon className="size-6" />
              <span className="text-xl/6 font-semibold text-primary-t">
                Delegated to{" "}
                <span className="font-mono">{shortenAddress(delegatee as `0x${string}`)}</span>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <GOHMTokenIcon className="size-6" />
              <div className="flex items-baseline gap-1">
                <span className="text-xl/6 font-semibold text-primary-t">0</span>
                <span className="text-xl/6 font-semibold text-primary-t">gOHM</span>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
