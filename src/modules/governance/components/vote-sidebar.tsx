import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApprovalQuorumBar } from "@/modules/governance/components/approval-quorum-bar";
import { useProposalDetails } from "@/modules/governance/hooks/useProposalDetails";
import { useContractParameters } from "@/modules/governance/hooks/useContractParameters";
import { useProposalTimeline } from "@/modules/governance/hooks/useProposalTimeline";
import { useVoteReceipt } from "@/modules/governance/hooks/useVoteReceipt";
import { useAccount } from "wagmi";
import type { ProposalStatus } from "@/modules/governance/helpers/proposal-status";
import { cn } from "@/lib/utils";
import {
  ExternalLink,
  CheckCircle,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  MinusCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function abbreviateNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function formatTimelineDate(date: Date | undefined): string {
  if (!date) return "";
  return (
    date.toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    }) +
    ", " +
    date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })
  );
}

function TimelineItem({
  label,
  date,
  txHash,
  isCompleted,
  isFuture,
}: {
  label: string;
  date: Date | undefined;
  txHash?: string;
  isCompleted: boolean;
  isFuture: boolean;
}) {
  const relativeTime = date && isFuture ? formatDistanceToNow(date, { addSuffix: true }) : null;
  const formattedDate = formatTimelineDate(date);

  return (
    <div className="flex items-start gap-3 relative">
      {/* Icon */}
      <div className="flex flex-col items-center shrink-0 mt-0.5">
        {isCompleted ? (
          <div className="size-5 rounded-full bg-primary-t flex items-center justify-center">
            <CheckCircle className="size-3 text-surface-bg-l1" />
          </div>
        ) : (
          <div
            className={cn(
              "size-5 rounded-full border-2 flex items-center justify-center",
              date ? "border-secondary-t/40" : "border-surface-a5",
            )}
          >
            <div
              className={cn("size-1.5 rounded-full", date ? "bg-secondary-t/40" : "bg-surface-a5")}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <span className="text-[11px] text-tertiary-t">{formattedDate}</span>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-xs font-medium",
              isCompleted ? "text-primary-t" : "text-secondary-t",
            )}
          >
            {label}
          </span>
          {isFuture && relativeTime && (
            <span className="text-[10px] bg-green-500/20 text-green-400 rounded px-1.5 py-0.5">
              {relativeTime}
            </span>
          )}
          {txHash && (
            <a
              href={`https://etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300"
            >
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Right sidebar on the proposal detail page.
 * Shows vote progress bars, vote counts, a vote button, and the proposal timeline.
 */
export function VoteSidebar({
  proposalId,
  startBlock: _startBlock,
  status,
  onVoteClick,
}: {
  proposalId: number;
  startBlock: number;
  status: ProposalStatus;
  onVoteClick: () => void;
}) {
  const { isConnected } = useAccount();
  const { data: details, isLoading: detailsLoading } = useProposalDetails({ proposalId });
  const { data: params } = useContractParameters();
  const { data: timeline } = useProposalTimeline({ proposalId, status });
  const { data: receipt } = useVoteReceipt({ proposalId });

  // Approval: For / (For + Against)
  const approvalPercent =
    details && details.forCount + details.againstCount > 0
      ? (details.forCount / (details.forCount + details.againstCount)) * 100
      : 0;

  // Quorum: For / totalSupply
  const quorumPercentParam = params?.proposalQuorumPercent;
  const totalSupply =
    details?.quorumVotes && quorumPercentParam
      ? details.quorumVotes / (quorumPercentParam / 100)
      : 0;
  const quorumActual = details && totalSupply > 0 ? (details.forCount / totalSupply) * 100 : 0;

  const approvalThreshold = params?.proposalApprovalThreshold ?? 50;
  const quorumThreshold = quorumPercentParam ?? 20;

  const aboveApproval = approvalPercent >= approvalThreshold;
  const aboveQuorum = details ? details.forCount > details.quorumVotes : false;

  const receiptData = receipt as { hasVoted: boolean; support: number; votes: bigint } | undefined;
  const hasVoted = receiptData?.hasVoted ?? false;
  const canVote = status === "Active" && isConnected && !hasVoted;

  const totalVotes = details ? details.forCount + details.againstCount + details.abstainCount : 0;

  const now = new Date();

  return (
    <div data-slot="vote-sidebar" className="flex flex-col gap-4">
      {/* Voting Progress */}
      <Card className="p-5">
        <div className="flex flex-col gap-4">
          {detailsLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <>
              {/* Quorum bar */}
              <div className="flex items-center gap-2">
                {aboveQuorum ? (
                  <CheckCircle className="size-4 text-green-400 shrink-0" />
                ) : (
                  <XCircle className="size-4 text-red-400 shrink-0" />
                )}
                <div className="flex-1">
                  <ApprovalQuorumBar
                    label="Quorum"
                    percentage={quorumActual}
                    threshold={quorumThreshold}
                    forPercent={aboveQuorum ? quorumActual : 0}
                    againstPercent={aboveQuorum ? 0 : quorumActual}
                    thresholdMet={aboveQuorum}
                  />
                </div>
              </div>

              {/* Approval bar */}
              <div className="flex items-center gap-2">
                {aboveApproval ? (
                  <CheckCircle className="size-4 text-green-400 shrink-0" />
                ) : (
                  <XCircle className="size-4 text-red-400 shrink-0" />
                )}
                <div className="flex-1">
                  <ApprovalQuorumBar
                    label="Approval"
                    percentage={approvalPercent}
                    threshold={approvalThreshold}
                    forPercent={aboveApproval ? approvalPercent : 0}
                    againstPercent={aboveApproval ? 0 : approvalPercent}
                    thresholdMet={aboveApproval}
                  />
                </div>
              </div>

              {/* Vote counts */}
              <div className="flex flex-col gap-2 pt-2 border-t border-a5-b">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <ThumbsUp className="size-3 text-green-400" />
                    <span className="text-secondary-t">For</span>
                  </div>
                  <span className="text-primary-t">{abbreviateNumber(details?.forCount ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <ThumbsDown className="size-3 text-red-400" />
                    <span className="text-secondary-t">Against</span>
                  </div>
                  <span className="text-primary-t">
                    {abbreviateNumber(details?.againstCount ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <MinusCircle className="size-3 text-tertiary-t" />
                    <span className="text-secondary-t">Abstain</span>
                  </div>
                  <span className="text-primary-t">
                    {abbreviateNumber(details?.abstainCount ?? 0)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-a5-b">
                  <span className="text-secondary-t font-medium">Total Votes</span>
                  <span className="text-primary-t font-medium">{abbreviateNumber(totalVotes)}</span>
                </div>
              </div>
            </>
          )}

          {hasVoted && (
            <div className="rounded-lg bg-surface-a3 px-3 py-2 text-xs text-secondary-t">
              You have already voted on this proposal.
            </div>
          )}

          <Button onClick={onVoteClick} disabled={!canVote} className="w-full">
            {hasVoted ? "Already Voted" : "Vote"}
          </Button>
        </div>
      </Card>

      {/* Timeline */}
      <Card className="p-5">
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-primary-t">Timeline</h3>

          <div className="flex flex-col gap-3 relative">
            {/* Vertical connecting line */}
            <div className="absolute left-[9px] top-3 bottom-3 w-px bg-surface-a5" />

            <TimelineItem
              label="Published onchain"
              date={details?.startDate ? new Date(details.startDate.getTime()) : undefined}
              isCompleted={true}
              isFuture={false}
            />
            <TimelineItem
              label="Voting period started"
              date={details?.startDate}
              isCompleted={status !== "Pending"}
              isFuture={details?.startDate ? details.startDate > now : false}
            />
            <TimelineItem
              label="End voting period"
              date={details?.endDate}
              isCompleted={status !== "Pending" && status !== "Active"}
              isFuture={details?.endDate ? details.endDate > now : false}
            />
            {(timeline?.queued.date || status === "Queued" || status === "Executed") && (
              <TimelineItem
                label="Queue proposal"
                date={timeline?.queued.date ?? details?.endDate}
                txHash={timeline?.queued.txHash}
                isCompleted={!!timeline?.queued.date}
                isFuture={false}
              />
            )}
            {(timeline?.executed.date || status === "Executed") && (
              <TimelineItem
                label="Execute proposal"
                date={timeline?.executed.date}
                txHash={timeline?.executed.txHash}
                isCompleted={!!timeline?.executed.date}
                isFuture={false}
              />
            )}
            {/* Always show Queue/Execute placeholders for active/succeeded proposals */}
            {!timeline?.queued.date && status !== "Queued" && status !== "Executed" && (
              <>
                <TimelineItem
                  label="Queue proposal"
                  date={details?.endDate}
                  isCompleted={false}
                  isFuture={true}
                />
                <TimelineItem
                  label="Execute proposal"
                  date={details?.endDate}
                  isCompleted={false}
                  isFuture={true}
                />
              </>
            )}
            {timeline?.canceled.date && (
              <TimelineItem
                label="Canceled"
                date={timeline.canceled.date}
                txHash={timeline.canceled.txHash}
                isCompleted={true}
                isFuture={false}
              />
            )}
            {timeline?.vetoed.date && (
              <TimelineItem
                label="Vetoed"
                date={timeline.vetoed.date}
                txHash={timeline.vetoed.txHash}
                isCompleted={true}
                isFuture={false}
              />
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
