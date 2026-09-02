import { useQuery } from "@tanstack/react-query";
import { getGovernorDelegates, type GetGovernorDelegates200DataItem } from "@/generated/indexer";

// The list route does NOT project `votesCasted` — only the by-address route
// does. The hand-written type used to claim both, so a component rendering a
// list row could type-check a read that is always undefined at runtime.
export type DelegateListRow = GetGovernorDelegates200DataItem;

// Voting power below this is dust and clutters the delegate list. Applied by
// the API rather than after the fact, so the page limit is spent on rows the
// UI will actually show.
const MIN_VOTING_POWER = "0.0001";

/**
 * Fetches delegates ordered by voting power, strongest first.
 */
export function useDelegates() {
  return useQuery({
    queryKey: ["governance", "delegates"],
    queryFn: async () => {
      try {
        const { data } = await getGovernorDelegates({
          minVotingPower: MIN_VOTING_POWER,
          limit: 1000,
        });
        return data;
      } catch (error) {
        console.error("useDelegates", error);
        return [];
      }
    },
  });
}
