import { useQuery } from "@tanstack/react-query";
import { fetchIndexerData } from "@/lib/indexer/client";
import {
  normalizeProposal,
  type SubgraphProposal,
} from "@/modules/governance/helpers/normalize-proposal";

/**
 * Fetches all proposals from the protocol indexer, normalized for UI consumption.
 *
 * The route returns newest proposal id first and its rows carry every field
 * `normalizeProposal` reads, so the normalizer is unchanged from the subgraph era.
 */
export function useProposals() {
  return useQuery({
    queryKey: ["governance", "proposals"],
    queryFn: async () => {
      try {
        const proposals = await fetchIndexerData<SubgraphProposal[]>("/v1/governor/proposals", {
          limit: 1000,
        });
        return proposals.map(normalizeProposal);
      } catch (error) {
        console.error("useProposals", error);
        return [];
      }
    },
  });
}
