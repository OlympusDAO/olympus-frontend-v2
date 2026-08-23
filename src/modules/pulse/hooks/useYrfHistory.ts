import { useQuery } from "@tanstack/react-query";
import { getBondsPurchases, getYrfNextYieldSets, getYrfRepoMarkets } from "@/generated/indexer";
import { fetchAllPages } from "@/lib/indexer/paginate";
import { getWeekStartUTC } from "@/lib/liveness/epoch";

export interface YrfWeeklyYield {
  weekLabel: string;
  weekStart: string;
  yieldDeployed: number;
  usdSpent: number;
  ohmBurned: number;
  contractVersion: string;
}

export interface YrfMarketBid {
  timestamp: number;
  bidAmount: number;
  marketId: string;
}

export interface YrfHistory {
  weeklyYields: YrfWeeklyYield[];
  recentBids: YrfMarketBid[];
  totalYieldDeployed: number;
  totalOhmBurned: number;
  totalUsdSpent: number;
  currentWeeklyYield: number;
  currentWeekUsdSpent: number;
}

/** Get the ISO week Monday (YYYY-MM-DD) for a Unix timestamp */
function getWeekMonday(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

function formatWeekLabel(monday: string): string {
  const d = new Date(`${monday}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// The `marketIds` filter is bounded by the API; YRF has more markets than that,
// so the ids are requested in chunks.
const MARKET_IDS_PER_REQUEST = 200;

export function useYrfHistory() {
  return useQuery<YrfHistory>({
    queryKey: ["yrfHistory"],
    queryFn: async () => {
      // 1. Fetch yield events and market IDs from YRF subgraph (paginated)
      const [nextYieldSets, repoMarkets, latestNextYieldSets] = await Promise.all([
        fetchAllPages((cursor) => getYrfNextYieldSets({ orderBy: "id", order: "asc", ...cursor })),
        fetchAllPages((cursor) => getYrfRepoMarkets({ orderBy: "id", order: "asc", ...cursor })),
        // Latest 25 by time. The id-paginated fetch above is id-ordered, which
        // is not strictly time-ordered, so its tail is not the most recent.
        getYrfNextYieldSets({ orderBy: "blockTimestamp", order: "desc", limit: 25 }).then(
          (response) => response.data,
        ),
      ]);

      const yrfMarketIds: string[] = repoMarkets.map((m) => m.marketId);

      // 2. Fetch actual OHM purchase amounts from the bonds domain.
      //
      // TODO(follow-up): these amounts could be attributed to YRF in the
      // indexer itself, which would remove this cross-domain join. Both
      // domains now live in one indexer, so that is a handler change rather
      // than a second subgraph.
      const ohmByWeek: Record<string, number> = {};
      const usdByWeek: Record<string, number> = {};
      let totalOhmBurned = 0;
      let totalUsdSpent = 0;

      if (yrfMarketIds.length > 0) {
        try {
          // `marketIds` accepts at most MARKET_IDS_PER_REQUEST values, and YRF
          // has ~700 markets — passing them all is a 400, not a truncation.
          const chunks: string[][] = [];
          for (let i = 0; i < yrfMarketIds.length; i += MARKET_IDS_PER_REQUEST) {
            chunks.push(yrfMarketIds.slice(i, i + MARKET_IDS_PER_REQUEST));
          }
          const bondPurchases = (
            await Promise.all(
              chunks.map((chunk) =>
                fetchAllPages((cursor) =>
                  getBondsPurchases({
                    marketIds: chunk.join(","),
                    orderBy: "id",
                    order: "asc",
                    ...cursor,
                  }),
                ),
              ),
            )
          ).flat();

          for (const purchase of bondPurchases) {
            const ohmAmount = parseFloat(purchase.amountInQuoteToken) || 0;
            const usdAmount = parseFloat(purchase.payoutInPayoutToken) || 0;
            const monday = getWeekMonday(Math.round(Number(purchase.timestamp) / 1000));
            ohmByWeek[monday] = (ohmByWeek[monday] ?? 0) + ohmAmount;
            usdByWeek[monday] = (usdByWeek[monday] ?? 0) + usdAmount;
            totalOhmBurned += ohmAmount;
            totalUsdSpent += usdAmount;
          }
        } catch {
          // Bond data is supplementary; chart falls back to estimates
        }
      }

      // 3. Process weekly yield events
      const yieldEvents: Array<{
        timestamp: number;
        yield: number;
        version: string;
      }> = nextYieldSets.map((e) => ({
        timestamp: Number(e.blockTimestamp),
        yield: parseFloat(e.nextYieldDecimal) || 0,
        version: e.contract.version,
      }));

      // Sort ascending for chart
      yieldEvents.sort((a, b) => a.timestamp - b.timestamp);

      // Deduplicate by week: during version transitions (v1.0→v1.1→v1.2),
      // multiple events can fire in the same week. Keep only the latest per week.
      const weekMap = new Map<string, { yield: number; version: string; timestamp: number }>();
      for (const e of yieldEvents) {
        const monday = getWeekMonday(e.timestamp);
        weekMap.set(monday, {
          yield: e.yield,
          version: e.version,
          timestamp: e.timestamp,
        });
      }

      const weeklyYields: YrfWeeklyYield[] = Array.from(weekMap.entries()).map(([monday, w]) => ({
        weekLabel: formatWeekLabel(monday),
        weekStart: monday,
        yieldDeployed: w.yield,
        usdSpent: usdByWeek[monday] ?? 0,
        ohmBurned: ohmByWeek[monday] ?? 0,
        contractVersion: w.version,
      }));

      const totalYieldDeployed = weeklyYields.reduce((sum, w) => sum + w.yieldDeployed, 0);

      // Current weekly yield is the latest non-zero deduped week's yield. The YRF subgraph can
      // emit zero-value setter events between funded weeks, which should not collapse forward-run
      // rate cards to 0.
      const currentWeeklyYield =
        latestNextYieldSets.map((w) => parseFloat(w.nextYieldDecimal) || 0).find((v) => v > 0) ??
        [...weeklyYields].reverse().find((w) => w.yieldDeployed > 0)?.yieldDeployed ??
        0;

      // Current week spend — look up bond purchases for the actual current calendar week
      const currentMonday = getWeekStartUTC().toISOString().split("T")[0];
      const currentWeekUsdSpent = usdByWeek[currentMonday] ?? 0;

      // Recent daily market bids (for activity feed)
      const recentBids: YrfMarketBid[] = repoMarkets
        .map((e) => ({
          timestamp: Number(e.blockTimestamp),
          bidAmount: parseFloat(e.bidAmountDecimal) || 0,
          marketId: e.marketId,
        }))
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 14);

      return {
        weeklyYields,
        recentBids,
        totalYieldDeployed,
        totalOhmBurned,
        totalUsdSpent,
        currentWeeklyYield,
        currentWeekUsdSpent,
      };
    },
    staleTime: 300_000,
    refetchInterval: 600_000,
  });
}
