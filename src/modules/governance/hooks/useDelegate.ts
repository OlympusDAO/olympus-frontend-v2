import { useQuery } from "@tanstack/react-query";
import request, { gql } from "graphql-request";
import { getGovernanceSubgraphUrl } from "@/modules/governance/hooks/useGovernanceSubgraph";
import type { Voter } from "@/modules/governance/hooks/useDelegates";

/**
 * Fetches a single voter/delegate by address from the governance subgraph.
 * Includes their voting power, votes cast, and delegators.
 */
export function useDelegate({ id }: { id: string }) {
  return useQuery({
    queryKey: ["governance", "delegate", id],
    queryFn: async () => {
      try {
        const query = gql`
          query {
            voter(id: "${id}") {
              address
              latestVotingPowerSnapshot {
                votingPower
              }
              votesCasted {
                proposalId
                reason
                support
              }
              delegators {
                id
              }
            }
          }
        `;

        const subgraphUrl = getGovernanceSubgraphUrl();
        const response = await request<{ voter: Voter }>(subgraphUrl, query);
        return response.voter;
      } catch (error) {
        console.error("useDelegate", error);
        return undefined;
      }
    },
    enabled: !!id,
  });
}
