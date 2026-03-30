import { Link } from "react-router-dom";
import { TableRow, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ProposalStatusBadge } from "@/modules/governance/components/proposal-status-badge";
import { ApprovalQuorumBar } from "@/modules/governance/components/approval-quorum-bar";
import { useProposalDetails } from "@/modules/governance/hooks/useProposalDetails";
import type { GovernanceParameters } from "@/modules/governance/hooks/useContractParameters";

/**
 * A table row representing a single governance proposal.
 * Fetches on-chain proposal details internally; receives shared contract parameters as a prop.
 */
export function ProposalRow({
  proposalId,
  title,
  createdAt,
  params,
}: {
  proposalId: number;
  title: string;
  createdAt: Date;
  params: GovernanceParameters | null | undefined;
}) {
  const { data: details, isLoading: detailsLoading } = useProposalDetails({ proposalId });

  const totalVotes = details ? details.forCount + details.againstCount + details.abstainCount : 0;

  // Approval: For / (For + Against) — how much of the voting power voted FOR
  const approvalPercent =
    details && details.forCount + details.againstCount > 0
      ? (details.forCount / (details.forCount + details.againstCount)) * 100
      : 0;

  // Quorum: For / totalSupply — what fraction of total gOHM voted FOR
  // We derive totalSupply from quorumVotes / (quorumPercent / 100)
  const quorumPercent = params?.proposalQuorumPercent;
  const totalSupply =
    details?.quorumVotes && quorumPercent ? details.quorumVotes / (quorumPercent / 100) : 0;
  const quorumActual = details && totalSupply > 0 ? (details.forCount / totalSupply) * 100 : 0;

  const approvalThreshold = params?.proposalApprovalThreshold ?? 50;
  const quorumThreshold = quorumPercent ?? 20;

  // Approval bar segments: For vs Against (relative to For+Against total)
  const approvalForSegment = approvalPercent;
  const approvalAgainstSegment = 100 - approvalPercent;

  // Quorum bar segments: forVotes relative to totalSupply
  const quorumForSegment = quorumActual;

  const aboveApproval = approvalPercent >= approvalThreshold;
  const aboveQuorum = details ? details.forCount > details.quorumVotes : false;

  return (
    <TableRow data-slot="proposal-row">
      <TableCell>
        <Link
          to={`/dao/vote/${proposalId}`}
          className="flex flex-col gap-1 hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-2">
            <span className="text-primary-t font-medium truncate max-w-[400px]">{title}</span>
            {detailsLoading ? (
              <Skeleton className="h-5 w-16" />
            ) : details ? (
              <ProposalStatusBadge status={details.status} />
            ) : null}
          </div>
          <span className="text-xs text-tertiary-t">
            {createdAt.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </Link>
      </TableCell>
      <TableCell>
        {detailsLoading ? (
          <Skeleton className="h-6 w-24" />
        ) : (
          <ApprovalQuorumBar
            percentage={approvalPercent}
            threshold={approvalThreshold}
            forPercent={approvalForSegment}
            againstPercent={details ? approvalAgainstSegment : 0}
            thresholdMet={aboveApproval}
          />
        )}
      </TableCell>
      <TableCell>
        {detailsLoading ? (
          <Skeleton className="h-6 w-24" />
        ) : (
          <ApprovalQuorumBar
            percentage={quorumActual}
            threshold={quorumThreshold}
            forPercent={quorumForSegment}
            againstPercent={0}
            thresholdMet={aboveQuorum}
          />
        )}
      </TableCell>
      <TableCell className="text-right">
        {detailsLoading ? (
          <Skeleton className="h-5 w-16 ml-auto" />
        ) : (
          <span className="text-secondary-t">
            {totalVotes.toLocaleString(undefined, { maximumFractionDigits: 2 })} gOHM
          </span>
        )}
      </TableCell>
    </TableRow>
  );
}
