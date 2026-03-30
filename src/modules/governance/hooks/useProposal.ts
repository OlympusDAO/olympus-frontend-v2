import { useQuery } from "@tanstack/react-query";
import request, { gql } from "graphql-request";
import {
  normalizeProposal,
  type SubgraphProposal,
} from "@/modules/governance/helpers/normalize-proposal";
import { getGovernanceSubgraphUrl } from "@/modules/governance/hooks/useGovernanceSubgraph";

type ProposalResponse = {
  proposalCreated: SubgraphProposal | null;
};

/**
 * Fetches a single proposal by ID from the governance subgraph.
 */
export function useProposal({ proposalId }: { proposalId?: string }) {
  return useQuery({
    queryKey: ["governance", "proposal", proposalId],
    queryFn: async () => {
      try {
        const query = gql`
          query {
            proposalCreated(id: ${proposalId}) {
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

        const subgraphUrl = getGovernanceSubgraphUrl();
        const response = await request<ProposalResponse>(subgraphUrl, query);
        if (!response.proposalCreated) {
          return null;
        }
        return normalizeProposal(response.proposalCreated);
      } catch (error) {
        console.error("useProposal", error);
        return null;
      }
    },
    enabled: !!proposalId,
  });
}
