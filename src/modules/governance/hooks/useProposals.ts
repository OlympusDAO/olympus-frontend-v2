import { useQuery } from "@tanstack/react-query";
import request, { gql } from "graphql-request";
import {
  normalizeProposal,
  type SubgraphProposal,
} from "@/modules/governance/helpers/normalize-proposal";
import { getGovernanceSubgraphUrl } from "@/modules/governance/hooks/useGovernanceSubgraph";

type ProposalsResponse = {
  proposalCreateds: SubgraphProposal[];
};

const PROPOSALS_QUERY = gql`
  query {
    proposalCreateds(first: 1000, orderBy: proposalId, orderDirection: desc) {
      proposalId
      proposer
      targets
      signatures
      calldatas
      transactionHash
      description
      blockTimestamp
      blockNumber
      startBlock
      values
    }
  }
`;

/**
 * Fetches all proposals from the governance subgraph, normalized for UI consumption.
 */
export function useProposals() {
  return useQuery({
    queryKey: ["governance", "proposals"],
    queryFn: async () => {
      try {
        const subgraphUrl = getGovernanceSubgraphUrl();
        const response = await request<ProposalsResponse>(subgraphUrl, PROPOSALS_QUERY);
        return response.proposalCreateds.map(normalizeProposal);
      } catch (error) {
        console.error("useProposals", error);
        return [];
      }
    },
  });
}
