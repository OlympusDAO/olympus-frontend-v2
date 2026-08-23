import { useQuery } from "@tanstack/react-query";
import { fetchIndexerData } from "@/lib/indexer/client";

export type Voter = {
  id: string;
  address: string;
  latestVotingPowerSnapshot: {
    votingPower: string;
  };
  votesCasted: {
    proposalId: string;
    reason: string;
    support: number;
  }[];
  delegators: {
    id: string;
  }[];
};

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
        return await fetchIndexerData<Voter[]>("/v1/governor/delegates", {
          minVotingPower: MIN_VOTING_POWER,
          limit: 1000,
        });
      } catch (error) {
        console.error("useDelegates", error);
        return [];
      }
    },
  });
}
