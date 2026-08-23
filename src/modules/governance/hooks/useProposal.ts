import { useQuery } from "@tanstack/react-query";
import { fetchIndexerData, IndexerError } from "@/lib/indexer/client";
import {
  normalizeProposal,
  type SubgraphProposal,
} from "@/modules/governance/helpers/normalize-proposal";

/**
 * Fetches a single proposal by id from the protocol indexer.
 */
export function useProposal({ proposalId }: { proposalId?: string }) {
  return useQuery({
    queryKey: ["governance", "proposal", proposalId],
    queryFn: async () => {
      try {
        const proposal = await fetchIndexerData<SubgraphProposal | null>(
          `/v1/governor/proposals/${encodeURIComponent(String(proposalId))}`,
        );
        return proposal ? normalizeProposal(proposal) : null;
      } catch (error) {
        // A proposal id that does not exist is a 404, not a failure worth logging.
        if (error instanceof IndexerError && error.status === 404) return null;
        console.error("useProposal", error);
        return null;
      }
    },
    enabled: !!proposalId,
  });
}
