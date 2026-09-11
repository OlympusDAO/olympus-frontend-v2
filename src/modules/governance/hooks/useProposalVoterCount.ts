import { useQuery } from "@tanstack/react-query";
import { getGovernorVotes } from "@/generated/indexer";
import { fetchAllPages } from "@/lib/indexer/paginate";

/**
 * Counts vote records (each address votes at most once) for a proposal.
 *
 * Paged so a proposal with more voters than one page is not silently
 * undercounted.
 */
export function useProposalVoterCount({ proposalId }: { proposalId?: number | string }) {
  return useQuery({
    queryKey: ["governance", "proposalVoterCount", proposalId],
    queryFn: async () => {
      const votes = await fetchAllPages((cursor) =>
        getGovernorVotes({
          proposalId: String(proposalId),
          orderBy: "id",
          order: "asc",
          ...cursor,
        }),
      );
      return votes.length;
    },
    enabled: proposalId != null,
  });
}
