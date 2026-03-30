import { useQuery } from "@tanstack/react-query";
import request, { gql } from "graphql-request";
import { getGovernanceSubgraphUrl } from "@/modules/governance/hooks/useGovernanceSubgraph";
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

type QueuedEvent = {
  proposalQueueds: {
    id: string;
    blockTimestamp: string;
    transactionHash: string;
  }[];
};

type ExecutedEvent = {
  proposalExecuteds: {
    id: string;
    blockTimestamp: string;
    transactionHash: string;
  }[];
};

type CanceledEvent = {
  proposalCanceleds: {
    id: string;
    blockTimestamp: string;
    transactionHash: string;
  }[];
};

type VetoedEvent = {
  proposalVetoeds: {
    id: string;
    blockTimestamp: string;
    transactionHash: string;
  }[];
};

const emptyEvent: TimelineEvent = { date: undefined, txHash: undefined };

/**
 * Consolidated hook for fetching proposal lifecycle timestamps from the subgraph.
 * Queries queued, executed, canceled, and vetoed events for a specific proposal.
 * Only fetches events that are relevant to the current proposal status.
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
      const subgraphUrl = getGovernanceSubgraphUrl();
      const result: ProposalTimeline = {
        queued: { ...emptyEvent },
        executed: { ...emptyEvent },
        canceled: { ...emptyEvent },
        vetoed: { ...emptyEvent },
      };

      try {
        // Fetch queued time if proposal was queued or later
        if (status === "Queued" || status === "Executed" || status === "Expired") {
          const queuedQuery = gql`
            query {
              proposalQueueds(where: { proposalId: ${proposalId} }) {
                id
                blockTimestamp
                transactionHash
              }
            }
          `;
          const queuedResponse = await request<QueuedEvent>(subgraphUrl, queuedQuery);
          const queuedEvent = queuedResponse.proposalQueueds[0];
          if (queuedEvent) {
            result.queued = {
              date: new Date(Number(queuedEvent.blockTimestamp) * 1000),
              txHash: queuedEvent.transactionHash,
            };
          }
        }

        // Fetch executed time
        if (status === "Executed") {
          const executedQuery = gql`
            query {
              proposalExecuteds(where: { proposalId: ${proposalId} }) {
                id
                blockTimestamp
                transactionHash
              }
            }
          `;
          const executedResponse = await request<ExecutedEvent>(subgraphUrl, executedQuery);
          const executedEvent = executedResponse.proposalExecuteds[0];
          if (executedEvent) {
            result.executed = {
              date: new Date(Number(executedEvent.blockTimestamp) * 1000),
              txHash: executedEvent.transactionHash,
            };
          }
        }

        // Fetch canceled time
        if (status === "Canceled") {
          const canceledQuery = gql`
            query {
              proposalCanceleds(where: { proposalId: ${proposalId} }) {
                id
                blockTimestamp
                transactionHash
              }
            }
          `;
          const canceledResponse = await request<CanceledEvent>(subgraphUrl, canceledQuery);
          const canceledEvent = canceledResponse.proposalCanceleds[0];
          if (canceledEvent) {
            result.canceled = {
              date: new Date(Number(canceledEvent.blockTimestamp) * 1000),
              txHash: canceledEvent.transactionHash,
            };
          }
        }

        // Fetch vetoed time
        if (status === "Vetoed") {
          const vetoedQuery = gql`
            query {
              proposalVetoeds(where: { proposalId: ${proposalId} }) {
                id
                blockTimestamp
                transactionHash
              }
            }
          `;
          const vetoedResponse = await request<VetoedEvent>(subgraphUrl, vetoedQuery);
          const vetoedEvent = vetoedResponse.proposalVetoeds[0];
          if (vetoedEvent) {
            result.vetoed = {
              date: new Date(Number(vetoedEvent.blockTimestamp) * 1000),
              txHash: vetoedEvent.transactionHash,
            };
          }
        }
      } catch (error) {
        console.error("useProposalTimeline", error);
      }

      return result;
    },
    enabled: !!proposalId && !!status,
  });
}
