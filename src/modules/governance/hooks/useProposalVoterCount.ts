import { useQuery } from "@tanstack/react-query";
import { fetchIndexerData } from "@/lib/indexer/client";

const PAGE_SIZE = 1000;

/**
 * Counts vote records (each address votes at most once) for a proposal.
 *
 * Pages by id so a proposal with more than PAGE_SIZE voters is not silently
 * undercounted — `sinceId` is the route's cursor, and id-ordering is what makes
 * the cursor stable.
 */
export function useProposalVoterCount({ proposalId }: { proposalId?: number | string }) {
  return useQuery({
    queryKey: ["governance", "proposalVoterCount", proposalId],
    queryFn: async () => {
      let total = 0;
      let sinceId: string | undefined;

      while (true) {
        const page = await fetchIndexerData<{ id: string }[]>("/v1/governor/votes", {
          proposalId: String(proposalId),
          orderBy: "id",
          order: "asc",
          limit: PAGE_SIZE,
          sinceId,
        });
        total += page.length;
        if (page.length < PAGE_SIZE) break;
        sinceId = page[page.length - 1].id;
      }

      return total;
    },
    enabled: proposalId != null,
  });
}
