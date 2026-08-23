import { useQuery } from "@tanstack/react-query";
import { getGovernorDelegatesByAddress } from "@/generated/indexer";
import { IndexerError } from "@/api/indexerHttpClient";

/**
 * Fetches a single delegate by address, with voting power, votes cast and
 * delegators.
 */
export function useDelegate({ id }: { id: string }) {
  return useQuery({
    queryKey: ["governance", "delegate", id],
    queryFn: async () => {
      try {
        const { data } = await getGovernorDelegatesByAddress(id);
        return data;
      } catch (error) {
        if (error instanceof IndexerError && error.status === 404) return undefined;
        console.error("useDelegate", error);
        return undefined;
      }
    },
    enabled: !!id,
  });
}
