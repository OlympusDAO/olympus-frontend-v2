import { useQuery } from "@tanstack/react-query";
import { getGovernorVotes } from "@/generated/indexer";

/**
 * Fetches individual vote records for a proposal, filtered by support type
 * (0 = Against, 1 = For, 2 = Abstain), heaviest vote first.
 */
export function useProposalVotes({
  proposalId,
  support,
}: {
  proposalId?: string;
  support: number;
}) {
  return useQuery({
    queryKey: ["governance", "proposalVotes", proposalId, support],
    queryFn: async () => {
      // `orderBy: votes` / `order: desc` are the route's defaults; stated here
      // because the UI depends on the ordering.
      const { data } = await getGovernorVotes({
        proposalId,
        support: String(support),
        orderBy: "votes",
        order: "desc",
        limit: 1000,
      });
      return data;
    },
    enabled: !!proposalId && support != null,
  });
}
