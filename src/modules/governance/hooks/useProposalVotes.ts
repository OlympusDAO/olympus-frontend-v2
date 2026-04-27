import { useQuery } from "@tanstack/react-query";
import request, { gql } from "graphql-request";
import { getGovernanceSubgraphUrl } from "@/modules/governance/hooks/useGovernanceSubgraph";

export type VoteCast = {
  votes: string;
  voter: { address: string };
  reason: string;
  support: number;
  transactionHash: string;
};

type VotesResponse = {
  voteCasts: VoteCast[];
};

/**
 * Fetches individual vote records for a proposal from the governance subgraph.
 * Filters by support type (0 = Against, 1 = For, 2 = Abstain).
 * Results are ordered by vote weight descending.
 */
export function useProposalVotes({
  proposalId,
  support,
}: {
  proposalId?: string;
  support: number;
}) {
  return useQuery({
    queryKey: ["governance", "proposalVotes", proposalId, support],
    queryFn: async () => {
      const query = gql`
        query {
          voteCasts(
            orderBy: votes
            orderDirection: desc
            where: { proposalId: ${proposalId}, support: ${support} }
          ) {
            votes
            voter {
              address
            }
            reason
            support
            transactionHash
          }
        }
      `;

      const subgraphUrl = getGovernanceSubgraphUrl();
      const response = await request<VotesResponse>(subgraphUrl, query);
      return response.voteCasts || [];
    },
    enabled: !!proposalId && support != null,
  });
}
