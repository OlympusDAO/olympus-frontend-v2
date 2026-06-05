import { useMemo } from "react";
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
import { ExternalLink } from "lucide-react";
import {
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiThumbUpFill,
  RiThumbDownFill,
  RiEyeCloseFill,
  RiLinksFill,
  RiMessage2Fill,
  RiChatCheckFill,
  RiSurveyFill,
  RiFlashlightFill,
} from "@remixicon/react";
import { formatDistanceToNow } from "date-fns";
import { badgeVariants } from "@/modules/governance/components/proposal-status-badge";
import { abbreviateNumber } from "@/modules/governance/helpers/format";

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

type TimelineState = "completed" | "active" | "inactive";

function TimelineItem({
  label,
  date,
  txHash,
  icon: Icon,
  state,
  showRelativeTime,
  isEstimate,
}: {
  label: string;
  date: Date | undefined;
  txHash?: string;
  icon: React.ComponentType<{ className?: string }>;
  state: TimelineState;
  showRelativeTime: boolean;
  isEstimate: boolean;
}) {
  const relativeTime =
    date && showRelativeTime ? formatDistanceToNow(date, { addSuffix: true }) : null;
  const formattedDate = formatTimelineDate(date);
  const displayDate = formattedDate && isEstimate ? `${formattedDate} (est.)` : formattedDate;

  return (
    <div className="flex items-center gap-3 relative first:[&>[data-line=top]]:hidden last:[&>[data-line=bottom]]:hidden">
      <div
        data-line="top"
        className="pointer-events-none absolute left-4 -translate-x-1/2 w-px bg-surface-a10 top-[-6px] h-[calc(50%-10px)]"
      />
      <div
        data-line="bottom"
        className="pointer-events-none absolute left-4 -translate-x-1/2 w-px bg-surface-a10 bottom-[-6px] h-[calc(50%-10px)]"
      />
      <div
        className={cn(
          "size-8 rounded-full border flex items-center justify-center shrink-0",
          state === "completed" && "border-primary-t text-primary-t",
          state === "active" && "bg-primary-t border-primary-t text-inverted-primary-t",
          state === "inactive" && "border-a10-b text-disabled-t",
        )}
      >
        <Icon className="size-4" />
      </div>

      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <span className="text-xs/4 font-normal text-tertiary-t">{displayDate}</span>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm/5 font-semibold",
              state === "completed" || state === "active" ? "text-primary-t" : "text-secondary-t",
            )}
          >
            {label}
          </span>
          {relativeTime && (
            <span className={cn(badgeVariants({ color: "yellow" }))}>{relativeTime}</span>
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
  publishedDate,
  onVoteClick,
}: {
  proposalId: number;
  startBlock: number;
  status: ProposalStatus;
  /** When the proposal was created onchain (ProposalCreated event timestamp). */
  publishedDate?: Date;
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

  const timelineItems = useMemo(
    () => buildTimelineItems({ details, timeline, status, publishedDate, params, now: new Date() }),
    [details, timeline, status, publishedDate, params],
  );

  return (
    <div data-slot="vote-sidebar" className="flex flex-col gap-6">
      {/* Voting Progress */}
      <Card className="p-6">
        <div className="flex flex-col gap-6">
          {detailsLoading ? (
            <div className="flex flex-col gap-6">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <>
              <ApprovalQuorumBar
                label="Quorum"
                icon={
                  aboveQuorum ? (
                    <RiCheckboxCircleLine className="size-5 text-green shrink-0" />
                  ) : (
                    <RiCloseCircleLine className="size-5 text-red shrink-0" />
                  )
                }
                percentage={quorumActual}
                threshold={quorumThreshold}
                forPercent={aboveQuorum ? quorumActual : 0}
                againstPercent={aboveQuorum ? 0 : quorumActual}
              />

              <ApprovalQuorumBar
                label="Approval"
                icon={
                  aboveApproval ? (
                    <RiCheckboxCircleLine className="size-5 text-green shrink-0" />
                  ) : (
                    <RiCloseCircleLine className="size-5 text-red shrink-0" />
                  )
                }
                percentage={approvalPercent}
                threshold={approvalThreshold}
                forPercent={aboveApproval ? approvalPercent : 0}
                againstPercent={aboveApproval ? 0 : approvalPercent}
              />

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RiThumbUpFill className="size-4 text-green" />
                    <span className="text-sm/5 font-semibold text-green">For</span>
                  </div>
                  <span className="text-sm/5 font-semibold text-primary-t">
                    {abbreviateNumber(details?.forCount ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RiThumbDownFill className="size-4 text-red" />
                    <span className="text-sm/5 font-semibold text-red">Against</span>
                  </div>
                  <span className="text-sm/5 font-semibold text-primary-t">
                    {abbreviateNumber(details?.againstCount ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RiEyeCloseFill className="size-4 text-tertiary-t" />
                    <span className="text-sm/5 font-semibold text-tertiary-t">Abstain</span>
                  </div>
                  <span className="text-sm/5 font-semibold text-primary-t">
                    {abbreviateNumber(details?.abstainCount ?? 0)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm/5 font-semibold text-primary-t">Total Votes</span>
                <span className="text-sm/5 font-semibold text-primary-t">
                  {abbreviateNumber(totalVotes)}
                </span>
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
      <div className="flex flex-col gap-3">
        <h2 className="text-[20px]/[24px] font-semibold text-primary-t">Timeline</h2>
        <Card className="p-6">
          <div className="flex flex-col gap-3">
            {timelineItems.map((item) => (
              <TimelineItem
                key={item.label}
                label={item.label}
                icon={item.icon}
                date={item.date}
                txHash={item.txHash}
                state={item.state}
                showRelativeTime={item.showRelativeTime}
                isEstimate={item.isEstimate}
              />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

type TimelineItemData = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  date: Date | undefined;
  txHash?: string;
  state: TimelineState;
  showRelativeTime: boolean;
  isEstimate: boolean;
};

type RawTimelineItem = Omit<
  TimelineItemData,
  "state" | "showRelativeTime" | "isEstimate" | "label"
> & {
  // pastLabel is shown once the step has happened (state = completed/active).
  // futureLabel is shown while the step is still upcoming (state = inactive);
  // terminal-only events (Canceled, Vetoed) omit it because they only render once completed.
  pastLabel: string;
  futureLabel?: string;
  isCompleted: boolean;
  isFuture: boolean;
};

const SECONDS_PER_BLOCK = 12;

function buildTimelineItems({
  details,
  timeline,
  status,
  publishedDate,
  params,
  now,
}: {
  details: ReturnType<typeof useProposalDetails>["data"];
  timeline: ReturnType<typeof useProposalTimeline>["data"];
  status: ProposalStatus;
  publishedDate?: Date;
  params: ReturnType<typeof useContractParameters>["data"];
  now: Date;
}): TimelineItemData[] {
  // Once a proposal is activated, endDate is known. While Pending, endBlock isn't
  // assigned yet, so estimate it as startBlock + votingPeriod and derive the queue
  // (right after voting ends) and execute (after the timelock delay) dates from there.
  // Any date in the future is flagged as an estimate (see isEstimate below).
  const estEndDate =
    details?.endDate ??
    (details?.startDate && params?.votingPeriodBlocks
      ? new Date(details.startDate.getTime() + params.votingPeriodBlocks * SECONDS_PER_BLOCK * 1000)
      : undefined);
  const estExecuteDate =
    estEndDate && params?.executionDelaySeconds
      ? new Date(estEndDate.getTime() + params.executionDelaySeconds * 1000)
      : estEndDate;

  const raw: RawTimelineItem[] = [
    {
      pastLabel: "Published onchain",
      icon: RiLinksFill,
      date: publishedDate,
      isCompleted: true,
      isFuture: false,
    },
    {
      pastLabel: "Voting period started",
      futureLabel: "Voting period starts",
      icon: RiMessage2Fill,
      date: details?.startDate,
      isCompleted: status !== "Pending",
      isFuture: details?.startDate ? details.startDate > now : false,
    },
    {
      pastLabel: "Voting period ended",
      futureLabel: "Voting period ends",
      icon: RiChatCheckFill,
      date: estEndDate,
      isCompleted: status !== "Pending" && status !== "Active",
      isFuture: estEndDate ? estEndDate > now : false,
    },
  ];

  if (timeline?.queued.date || status === "Queued" || status === "Executed") {
    raw.push({
      pastLabel: "Proposal queued",
      futureLabel: "Queue proposal",
      icon: RiSurveyFill,
      date: timeline?.queued.date ?? estEndDate,
      txHash: timeline?.queued.txHash,
      isCompleted: !!timeline?.queued.date,
      isFuture: false,
    });
  }
  if (timeline?.executed.date || status === "Executed") {
    raw.push({
      pastLabel: "Proposal executed",
      futureLabel: "Execute proposal",
      icon: RiFlashlightFill,
      date: timeline?.executed.date ?? estExecuteDate,
      txHash: timeline?.executed.txHash,
      isCompleted: !!timeline?.executed.date,
      isFuture: false,
    });
  }
  if (!timeline?.queued.date && status !== "Queued" && status !== "Executed") {
    raw.push(
      {
        pastLabel: "Proposal queued",
        futureLabel: "Queue proposal",
        icon: RiSurveyFill,
        date: estEndDate,
        isCompleted: false,
        isFuture: true,
      },
      {
        pastLabel: "Proposal executed",
        futureLabel: "Execute proposal",
        icon: RiFlashlightFill,
        date: estExecuteDate,
        isCompleted: false,
        isFuture: true,
      },
    );
  }
  if (timeline?.canceled.date) {
    raw.push({
      pastLabel: "Canceled",
      icon: RiCloseCircleLine,
      date: timeline.canceled.date,
      txHash: timeline.canceled.txHash,
      isCompleted: true,
      isFuture: false,
    });
  }
  if (timeline?.vetoed.date) {
    raw.push({
      pastLabel: "Vetoed",
      icon: RiCloseCircleLine,
      date: timeline.vetoed.date,
      txHash: timeline.vetoed.txHash,
      isCompleted: true,
      isFuture: false,
    });
  }

  // The most recent completed step represents the current period (active).
  // Earlier completed steps stay "completed"; everything after is "inactive".
  // The "in N days" tag attaches to the next upcoming step only.
  let activeIdx = -1;
  raw.forEach((item, i) => {
    if (item.isCompleted) activeIdx = i;
  });

  return raw.map(({ isCompleted: _c, isFuture, pastLabel, futureLabel, ...item }, i) => {
    let state: TimelineState;
    if (i < activeIdx) state = "completed";
    else if (i === activeIdx) state = "active";
    else state = "inactive";
    const showRelativeTime = i === activeIdx + 1 && isFuture;
    // A date in the future can't have happened yet, so it's a projection, not a fact.
    const isEstimate = !!item.date && item.date > now;
    // Past tense once the step has happened (completed/active); future tense while
    // it's still upcoming. Terminal-only steps (Canceled, Vetoed) only set pastLabel.
    const label = state === "inactive" && futureLabel !== undefined ? futureLabel : pastLabel;
    return { ...item, label, state, showRelativeTime, isEstimate };
  });
}
