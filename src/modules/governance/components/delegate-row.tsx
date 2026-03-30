import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { Voter } from "@/modules/governance/hooks/useDelegates";

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Table row for a single delegate in the delegates list.
 * Shows address, delegation count, voting power, percentage of total, and a delegate button.
 */
export function DelegateRow({
  delegate,
  quorum,
  onDelegate,
  onClick,
}: {
  delegate: Voter;
  quorum: number | undefined;
  onDelegate: (address: string) => void;
  onClick: () => void;
}) {
  const votingPower = Number(delegate.latestVotingPowerSnapshot.votingPower);
  const delegationCount = delegate.delegators.length;
  const percentOfQuorum = quorum && quorum > 0 ? (votingPower / quorum) * 100 : 0;

  return (
    <TableRow data-slot="delegate-row" className="cursor-pointer" onClick={onClick}>
      <TableCell>
        <a
          href={`https://etherscan.io/address/${delegate.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-blue-400 hover:text-blue-300"
          onClick={(e) => e.stopPropagation()}
        >
          {shortenAddress(delegate.address)}
        </a>
      </TableCell>
      <TableCell>
        <span className="text-sm text-primary-t">{delegationCount}</span>
      </TableCell>
      <TableCell>
        <span className="text-sm text-primary-t">
          {votingPower.toLocaleString(undefined, { maximumFractionDigits: 2 })} gOHM
        </span>
      </TableCell>
      <TableCell>
        <span className="text-sm text-secondary-t">{percentOfQuorum.toFixed(2)}%</span>
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
