import { useQuery } from "@tanstack/react-query";
import { getGovernorProposalsById } from "@/generated/indexer";
import { IndexerError } from "@/api/indexerHttpClient";
import { normalizeProposal } from "@/modules/governance/helpers/normalize-proposal";

/**
 * Fetches a single proposal by id from the protocol indexer.
 */
export function useProposal({ proposalId }: { proposalId?: string }) {
  return useQuery({
    queryKey: ["governance", "proposal", proposalId],
    queryFn: async () => {
      try {
        const { data } = await getGovernorProposalsById(String(proposalId));
        return data ? normalizeProposal(data) : null;
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
