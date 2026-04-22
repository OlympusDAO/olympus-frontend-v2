import { useQuery } from "@tanstack/react-query";
import request, { gql } from "graphql-request";
import { getGovernanceSubgraphUrl } from "@/modules/governance/hooks/useGovernanceSubgraph";

type VoterCountResponse = {
  voteCasts: { id: string }[];
};

/**
 * Counts distinct vote records (voter addresses) for a proposal from the governance subgraph.
 */
export function useProposalVoterCount({ proposalId }: { proposalId?: number | string }) {
  return useQuery({
    queryKey: ["governance", "proposalVoterCount", proposalId],
    queryFn: async () => {
      const query = gql`
        query {
          voteCasts(first: 1000, where: { proposalId: ${proposalId} }) {
            id
          }
        }
      `;
      const subgraphUrl = getGovernanceSubgraphUrl();
      const response = await request<VoterCountResponse>(subgraphUrl, query);
      return response.voteCasts?.length ?? 0;
    },
    enabled: proposalId != null,
  });
}
