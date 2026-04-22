import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { GOHMTokenIcon } from "@/icons";
import type { Voter } from "@/modules/governance/hooks/useDelegates";

export function DelegateRow({
  delegate,
  onDelegate,
  onClick,
}: {
  delegate: Voter;
  onDelegate: (address: string) => void;
  onClick: () => void;
}) {
  const votingPower = Number(delegate.latestVotingPowerSnapshot.votingPower);
  const delegationCount = delegate.delegators.length;

  return (
    <TableRow data-slot="delegate-row" className="cursor-pointer" onClick={onClick}>
      <TableCell>
        <a
          href={`https://etherscan.io/address/${delegate.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-t hover:text-blue transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {delegate.address}
        </a>
      </TableCell>
      <TableCell>
        <span className="text-primary-t">{delegationCount}</span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <GOHMTokenIcon className="size-5" />
          <span className="text-primary-t">
            {votingPower.toLocaleString(undefined, { maximumFractionDigits: 2 })} gOHM
          </span>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <Button
          size="sm"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            onDelegate(delegate.address);
          }}
        >
          Delegate
        </Button>
      </TableCell>
    </TableRow>
  );
}
