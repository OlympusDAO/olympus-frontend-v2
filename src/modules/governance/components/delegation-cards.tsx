import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import { RiWalletLine, RiTokenSwapLine } from "@remixicon/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GOHMTokenIcon } from "@/icons";
import { useVotingWeight } from "@/modules/governance/hooks/useVotingWeight";
import { useCheckDelegation } from "@/modules/governance/hooks/useCheckDelegation";
import { useMonoCoolerPosition } from "@/lib/hooks/cooler/useMonoCoolerPosition";
import { useMonoCoolerDelegations } from "@/modules/governance/hooks/useMonoCoolerDelegations";
import { shortenAddress } from "@/lib/helpers";

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
  const { delegations, delegationsLoading: coolerDelegationsLoading } = useMonoCoolerDelegations();

  if (!isConnected) {
    return null;
  }

  const formattedWeight = votingWeight
    ? Number(votingWeight).toLocaleString(undefined, { maximumFractionDigits: 4 })
    : "0";

  const coolerCollateral = position
    ? Number(formatUnits(position.collateral, 18)).toLocaleString(undefined, {
        maximumFractionDigits: 4,
      })
    : "0";

  const isDelegated = !!delegatee && delegatee.toLowerCase() !== address?.toLowerCase();

  const activeCoolerDelegations = delegations?.filter((d) => d.amount > 0n) ?? [];
  const coolerDelegationCount = activeCoolerDelegations.length;

  return (
    <div data-slot="delegation-cards" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Card className="p-6 flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <RiWalletLine className="size-6 text-secondary-t" />
          <h3 className="text-xl/6 font-semibold text-primary-t tracking-[0.2px]">
            Wallet Voting Power
          </h3>
        </div>

        <div className="flex flex-col">
          <Row
            label="Balance"
            value={
              weightLoading ? (
                <Skeleton className="h-5 w-24" />
              ) : (
                <div className="flex items-center gap-1.5">
                  <GOHMTokenIcon className="size-5" />
                  <span className="text-sm/5 font-semibold text-primary-t">
                    {formattedWeight} gOHM
                  </span>
                </div>
              )
            }
          />
          <Row
            label="Status"
            isLast
            value={
              delegationLoading ? (
                <Skeleton className="h-5 w-32" />
              ) : isDelegated ? (
                <span className="text-sm/5 font-semibold text-primary-t">
                  Delegated to {shortenAddress(delegatee as `0x${string}`)}
                </span>
              ) : (
                <span className="text-sm/5 font-semibold text-primary-t">Not delegated</span>
              )
            }
          />
        </div>

        <div className="flex items-center justify-end gap-2 w-full">
          {isDelegated && (
            <Button variant="secondary" className="flex-1" onClick={onRevoke}>
              Revoke Delegation
            </Button>
          )}
          <Button className="flex-1" onClick={onDelegate}>
            Delegate
          </Button>
        </div>
      </Card>

      <Card className="p-6 flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <RiTokenSwapLine className="size-6 text-secondary-t" />
          <h3 className="text-xl/6 font-semibold text-primary-t tracking-[0.2px]">
            Cooler V2 Voting Power
          </h3>
        </div>

        <div className="flex flex-col">
          <Row
            label="Collateral"
            value={
              positionLoading ? (
                <Skeleton className="h-5 w-24" />
              ) : (
                <div className="flex items-center gap-1.5">
                  <GOHMTokenIcon className="size-5" />
                  <span className="text-sm/5 font-semibold text-primary-t">
                    {coolerCollateral} gOHM
                  </span>
                </div>
              )
            }
          />
          <Row
            label="Status"
            isLast
            value={
              coolerDelegationsLoading ? (
                <Skeleton className="h-5 w-32" />
              ) : coolerDelegationCount === 0 ? (
                <span className="text-sm/5 font-semibold text-primary-t">Not delegated</span>
              ) : coolerDelegationCount === 1 ? (
                <span className="text-sm/5 font-semibold text-primary-t">
                  Delegated to {shortenAddress(activeCoolerDelegations[0].delegate)}
                </span>
              ) : (
                <span className="text-sm/5 font-semibold text-primary-t">
                  Delegated to {coolerDelegationCount} addresses
                </span>
              )
            }
          />
        </div>

        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="secondary" className="flex-1" onClick={onManageCooler}>
            Manage Delegations
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <div className={isLast ? "" : "border-b border-a5-b pb-3 mb-3"}>
      <div className="flex items-center justify-between">
        <span className="text-sm/5 font-normal text-secondary-t">{label}</span>
        {value}
      </div>
    </div>
  );
}
