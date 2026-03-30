import { useQuery } from "@tanstack/react-query";
import request, { gql } from "graphql-request";
import { getGovernanceSubgraphUrl } from "@/modules/governance/hooks/useGovernanceSubgraph";

export type Voter = {
  id: string;
  address: string;
  latestVotingPowerSnapshot: {
    votingPower: string;
  };
  votesCasted: {
    proposalId: string;
    reason: string;
    support: number;
  }[];
  delegators: {
    id: string;
  }[];
};

const DELEGATES_QUERY = gql`
  query {
    voters(
      first: 1000
      orderBy: latestVotingPowerSnapshot__votingPower
      orderDirection: desc
      where: { latestVotingPowerSnapshot_not: null, latestVotingPowerSnapshot_: { votingPower_gt: 0.0001 } }
    ) {
      id
      address
      latestVotingPowerSnapshot {
        votingPower
      }
      delegators {
        id
      }
    }
  }
`;

/**
 * Fetches all voters from the governance subgraph, ordered by voting power.
 * Filters out voters with negligible voting power (< 0.0001).
 */
export function useDelegates() {
  return useQuery({
    queryKey: ["governance", "delegates"],
    queryFn: async () => {
      try {
        const subgraphUrl = getGovernanceSubgraphUrl();
        const response = await request<{ voters: Voter[] }>(subgraphUrl, DELEGATES_QUERY);
        return response.voters;
      } catch (error) {
        console.error("useDelegates", error);
        return [];
      }
    },
  });
}
