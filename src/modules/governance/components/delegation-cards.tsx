import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useVotingWeight } from "@/modules/governance/hooks/useVotingWeight";
import { useCheckDelegation } from "@/modules/governance/hooks/useCheckDelegation";
import { useMonoCoolerPosition } from "@/lib/hooks/cooler/useMonoCoolerPosition";
import { shortenAddress } from "@/lib/helpers";

/**
 * Two cards at the top of the delegate page showing wallet and Cooler V2 voting power.
 * When not connected, shows a connect wallet prompt.
 */
export function DelegationCards({
  onDelegate,
  onManageCooler,
  onRevoke,
}: {
  onDelegate: () => void;
  onManageCooler: () => void;
  onRevoke: () => void;
}) {
  const { address, isConnected } = useAccount();
  const { data: votingWeight, isLoading: weightLoading } = useVotingWeight({});
  const { data: delegatee, isLoading: delegationLoading } = useCheckDelegation({ address });
  const { position, isLoading: positionLoading } = useMonoCoolerPosition();

  const coolerCollateral = position
    ? Number(formatUnits(position.collateral, 18)).toLocaleString(undefined, {
        maximumFractionDigits: 4,
      })
    : "0";

  if (!isConnected) {
    return (
      <Card className="p-6">
        <p className="text-sm text-tertiary-t text-center">Connect wallet to delegate voting</p>
      </Card>
    );
  }

  const formattedWeight = votingWeight
    ? Number(votingWeight).toLocaleString(undefined, { maximumFractionDigits: 4 })
    : "0";

  const isDelegated = !!delegatee && delegatee.toLowerCase() !== address?.toLowerCase();

  return (
    <div data-slot="delegation-cards" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Wallet Voting Power */}
      <Card className="p-5">
        <div className="flex flex-col gap-3">
          <span className="text-xs text-secondary-t font-medium uppercase tracking-wide">
            Wallet Voting Power
          </span>
          {weightLoading ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-semibold text-primary-t">{formattedWeight}</span>
              <span className="text-sm text-secondary-t">gOHM</span>
            </div>
          )}

          {delegationLoading ? (
            <Skeleton className="h-4 w-40" />
          ) : isDelegated ? (
            <span className="text-xs text-secondary-t">
              Delegated to:{" "}
              <span className="font-mono text-primary-t">{shortenAddress(delegatee)}</span>
            </span>
          ) : (
            <span className="text-xs text-tertiary-t">Not delegated</span>
          )}

          <div className="flex gap-2 pt-1">
            {isDelegated && (
              <Button variant="secondary" size="sm" onClick={onRevoke}>
                Revoke Delegation
              </Button>
            )}
            <Button size="sm" onClick={onDelegate}>
              Delegate
            </Button>
          </div>
        </div>
      </Card>

      {/* Cooler V2 Voting Power */}
      <Card className="p-5">
        <div className="flex flex-col gap-3">
          <span className="text-xs text-secondary-t font-medium uppercase tracking-wide">
            Cooler V2 Voting Power
          </span>
          {positionLoading ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-semibold text-primary-t">{coolerCollateral}</span>
              <span className="text-sm text-secondary-t">gOHM</span>
            </div>
          )}
          <span className="text-xs text-tertiary-t">Collateral from Cooler V2 loans</span>
          <Button variant="secondary" size="sm" onClick={onManageCooler}>
            Manage Delegations
          </Button>
        </div>
      </Card>
    </div>
  );
}
