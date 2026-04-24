import { useQuery } from "@tanstack/react-query";
import request, { gql } from "graphql-request";
import { getGovernanceSubgraphUrl } from "@/modules/governance/hooks/useGovernanceSubgraph";

type VoterCountResponse = {
  voteCasts: { id: string }[];
};

const PAGE_SIZE = 1000;

const VOTER_COUNT_QUERY = gql`
  query VoterCount($proposalId: BigInt!, $first: Int!, $idGt: String!) {
    voteCasts(
      first: $first
      orderBy: id
      orderDirection: asc
      where: { proposalId: $proposalId, id_gt: $idGt }
    ) {
      id
    }
  }
`;

/**
 * Counts vote records (each address votes at most once) for a proposal.
 * Pages through the subgraph in batches of PAGE_SIZE so proposals with more
 * than 1000 voters are not silently undercounted.
 */
export function useProposalVoterCount({ proposalId }: { proposalId?: number | string }) {
  return useQuery({
    queryKey: ["governance", "proposalVoterCount", proposalId],
    queryFn: async () => {
      const subgraphUrl = getGovernanceSubgraphUrl();
      let total = 0;
      let idGt = "";
      while (true) {
        const { voteCasts } = await request<VoterCountResponse>(subgraphUrl, VOTER_COUNT_QUERY, {
          proposalId: String(proposalId),
          first: PAGE_SIZE,
          idGt,
        });
        total += voteCasts.length;
        if (voteCasts.length < PAGE_SIZE) break;
        idGt = voteCasts[voteCasts.length - 1].id;
      }
      return total;
    },
    enabled: proposalId != null,
  });
}
