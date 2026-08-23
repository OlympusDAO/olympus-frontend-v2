import { useQuery } from "@tanstack/react-query";
import { fetchIndexerData, IndexerError } from "@/lib/indexer/client";
import type { Voter } from "@/modules/governance/hooks/useDelegates";

/**
 * Fetches a single delegate by address, with voting power, votes cast and
 * delegators.
 */
export function useDelegate({ id }: { id: string }) {
  return useQuery({
    queryKey: ["governance", "delegate", id],
    queryFn: async () => {
      try {
        return await fetchIndexerData<Voter>(`/v1/governor/delegates/${encodeURIComponent(id)}`);
      } catch (error) {
        if (error instanceof IndexerError && error.status === 404) return undefined;
        console.error("useDelegate", error);
        return undefined;
      }
    },
    enabled: !!id,
  });
}
