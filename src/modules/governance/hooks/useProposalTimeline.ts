import { useQuery } from "@tanstack/react-query";
import { getGovernorProposalsByIdTimeline } from "@/generated/indexer";
import type { ProposalStatus } from "@/modules/governance/helpers/proposal-status";

type TimelineEvent = {
  date: Date | undefined;
  txHash: string | undefined;
};

export type ProposalTimeline = {
  queued: TimelineEvent;
  executed: TimelineEvent;
  canceled: TimelineEvent;
  vetoed: TimelineEvent;
};

// Every marker list carries these two fields; the generated per-list types
// differ only in the extras (queued also has `eta`), so the reader takes the
// common shape.
type TimelineMarker = { blockTimestamp: string; transactionHash: string };

const emptyEvent: TimelineEvent = { date: undefined, txHash: undefined };

function toEvent(markers: TimelineMarker[] | undefined): TimelineEvent {
  const marker = markers?.[0];
  if (!marker) return { ...emptyEvent };
  return {
    date: new Date(Number(marker.blockTimestamp) * 1000),
    txHash: marker.transactionHash,
  };
}

/**
 * Proposal lifecycle timestamps: queued, executed, canceled, vetoed.
 *
 * One request. The subgraph version fired up to four queries and gated each on
 * the proposal's status to avoid the round trips; the route returns all four
 * markers together, so the status gate is gone and a proposal that changed
 * status between render and fetch no longer returns a partially-filled
 * timeline.
 */
export function useProposalTimeline({
  proposalId,
  status,
}: {
  proposalId: number;
  status?: ProposalStatus;
}) {
  return useQuery({
    queryKey: ["governance", "proposalTimeline", proposalId, status],
    queryFn: async (): Promise<ProposalTimeline> => {
      try {
        const { data: timeline } = await getGovernorProposalsByIdTimeline(String(proposalId));
        return {
          queued: toEvent(timeline.queued),
          executed: toEvent(timeline.executed),
          canceled: toEvent(timeline.canceled),
          vetoed: toEvent(timeline.vetoed),
        };
      } catch (error) {
        console.error("useProposalTimeline", error);
        return {
          queued: { ...emptyEvent },
          executed: { ...emptyEvent },
          canceled: { ...emptyEvent },
          vetoed: { ...emptyEvent },
        };
      }
    },
    enabled: !!proposalId && !!status,
  });
}
