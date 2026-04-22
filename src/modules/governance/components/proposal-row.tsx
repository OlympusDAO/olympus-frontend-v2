import { useNavigate } from "react-router-dom";
import { formatEther } from "viem";
import { RiThumbUpFill, RiThumbDownFill, RiEyeCloseFill } from "@remixicon/react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ProposalStatusBadge } from "@/modules/governance/components/proposal-status-badge";
import { ApprovalQuorumBar } from "@/modules/governance/components/approval-quorum-bar";
import { VotingStartsIn } from "@/modules/governance/components/voting-starts-in";
import { useProposalDetails } from "@/modules/governance/hooks/useProposalDetails";
import { useProposalVoterCount } from "@/modules/governance/hooks/useProposalVoterCount";
import { useVoteReceipt } from "@/modules/governance/hooks/useVoteReceipt";
import type { GovernanceParameters } from "@/modules/governance/hooks/useContractParameters";

const createdAtFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const voteFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
});

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
  const navigate = useNavigate();
  const { data: details, isLoading: detailsLoading } = useProposalDetails({ proposalId });
  const { data: voterCount } = useProposalVoterCount({ proposalId });
  const { data: receipt } = useVoteReceipt({ proposalId });
  const receiptData = receipt as { hasVoted: boolean; support: number; votes: bigint } | undefined;
  const userVotes = receiptData?.hasVoted ? Number(formatEther(receiptData.votes)) : 0;
  const userVotesLabel = voteFormatter.format(userVotes);

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

  return (
    <TableRow
      data-slot="proposal-row"
      onClick={() => navigate(`/dao/vote/${proposalId}`)}
      className="cursor-pointer"
    >
      <TableCell>
        <div className="flex flex-col gap-1">
          <span className="text-sm/5 font-semibold text-primary-t truncate max-w-[400px]">
            {title}
          </span>
          <div className="flex items-center gap-2">
            {detailsLoading ? (
              <Skeleton className="h-4 w-16" />
            ) : details ? (
              <ProposalStatusBadge status={details.status} />
            ) : null}
            <span className="text-xs/4 font-normal text-secondary-t">
              {createdAtFormatter.format(createdAt)}
            </span>
          </div>
        </div>
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
          />
        )}
      </TableCell>
      <TableCell className="text-right">
        {receiptData?.hasVoted ? (
          <div className="flex flex-col gap-1 items-end">
            <span className="text-sm/5 font-semibold text-primary-t">{userVotesLabel} gOHM</span>
            <div className="flex items-center gap-1 text-xs/4">
              {receiptData.support === 1 ? (
                <>
                  <RiThumbUpFill className="size-3 text-green" />
                  <span className="text-green-400">{userVotesLabel}</span>
                </>
              ) : receiptData.support === 0 ? (
                <>
                  <RiThumbDownFill className="size-3 text-red" />
                  <span className="text-red-400">{userVotesLabel}</span>
                </>
              ) : (
                <>
                  <RiEyeCloseFill className="size-3 text-tertiary-t" />
                  <span className="text-tertiary-t">{userVotesLabel}</span>
                </>
              )}
            </div>
          </div>
        ) : (
          <span className="text-sm/5 text-tertiary-t">—</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        {detailsLoading ? (
          <Skeleton className="h-5 w-16 ml-auto" />
        ) : details?.status === "Pending" ? (
          <VotingStartsIn startDate={details.startDate} />
        ) : (
          <div className="flex flex-col gap-1 items-end">
            <span className="text-sm/5 font-semibold text-primary-t">
              {totalVotes.toLocaleString(undefined, { maximumFractionDigits: 2 })} gOHM
            </span>
            {voterCount != null && (
              <span className="text-xs/4 font-normal text-secondary-t">
                {voterCount.toLocaleString()} {voterCount === 1 ? "address" : "addresses"}
              </span>
            )}
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
