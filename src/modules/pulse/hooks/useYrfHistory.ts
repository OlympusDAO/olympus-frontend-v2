import { useQuery } from "@tanstack/react-query";
import { YRF_SUBGRAPH_URL, BOND_SUBGRAPH_URL } from "@/lib/constants";
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

const PAGE_SIZE = 1000;

// Cursor-paginate a subgraph entity using the `id_gt` pattern so we get the
// full history instead of being capped at a single 1000-row page.
async function fetchAllPages<T extends { id: string }>(
  url: string,
  buildQuery: (idGt: string, first: number) => string,
  extractPage: (data: Record<string, unknown>) => T[] | undefined,
): Promise<T[]> {
  const all: T[] = [];
  let lastId = "";
  for (;;) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: buildQuery(lastId, PAGE_SIZE) }),
    });
    if (!response.ok) throw new Error("Subgraph fetch failed");
    const { data, errors } = (await response.json()) as {
      data?: Record<string, unknown>;
      errors?: Array<{ message?: string }>;
    };
    if (errors) throw new Error(errors[0]?.message || "Subgraph query error");
    const page = (data && extractPage(data)) ?? [];
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    lastId = page[page.length - 1].id;
  }
  return all;
}

interface NextYieldSetRow {
  id: string;
  nextYieldDecimal: string;
  blockTimestamp: string;
  contract: { version: string };
}

interface RepoMarketRow {
  id: string;
  marketId: string;
  blockTimestamp: string;
  bidAmountDecimal: string;
}

interface BondPurchaseRow {
  id: string;
  timestamp: string;
  amountInQuoteToken: string;
  payoutInPayoutToken: string;
  marketId: string;
}

export function useYrfHistory() {
  return useQuery<YrfHistory>({
    queryKey: ["yrfHistory"],
    queryFn: async () => {
      // 1. Fetch yield events and market IDs from YRF subgraph (paginated)
      const [nextYieldSets, repoMarkets] = await Promise.all([
        fetchAllPages<NextYieldSetRow>(
          YRF_SUBGRAPH_URL,
          (idGt, first) => `
            {
              nextYieldSets(
                first: ${first}
                where: { id_gt: "${idGt}" }
                orderBy: id
                orderDirection: asc
              ) {
                id
                nextYieldDecimal
                blockTimestamp
                contract { version }
              }
            }
          `,
          (d) => d.nextYieldSets as NextYieldSetRow[] | undefined,
        ),
        fetchAllPages<RepoMarketRow>(
          YRF_SUBGRAPH_URL,
          (idGt, first) => `
            {
              repoMarkets(
                first: ${first}
                where: { id_gt: "${idGt}" }
                orderBy: id
                orderDirection: asc
              ) {
                id
                marketId
                blockTimestamp
                bidAmountDecimal
              }
            }
          `,
          (d) => d.repoMarkets as RepoMarketRow[] | undefined,
        ),
      ]);

      const yrfMarketIds: string[] = repoMarkets.map((m) => m.marketId);

      // 2. Fetch actual OHM purchase amounts from bond market subgraph.
      //
      // TODO(follow-up): OHM purchase amounts (amountInQuoteToken from bond
      // purchases) should ideally be indexed directly in the YRF subgraph,
      // removing the need to cross-reference the bond market subgraph.
      // Bond subgraph: https://thegraph.com/explorer/subgraphs/E4Mikyz3ec1MGGFYNuEDQ3F1qtcLashFKwyTvnbfa9Ss
      const ohmByWeek: Record<string, number> = {};
      const usdByWeek: Record<string, number> = {};
      let totalOhmBurned = 0;
      let totalUsdSpent = 0;

      if (yrfMarketIds.length > 0) {
        try {
          const marketIdList = yrfMarketIds.map((id) => `"${id}"`).join(",");
          const bondPurchases = await fetchAllPages<BondPurchaseRow>(
            BOND_SUBGRAPH_URL,
            (idGt, first) => `
              {
                bondPurchases(
                  first: ${first}
                  where: { marketId_in: [${marketIdList}], id_gt: "${idGt}" }
                  orderBy: id
                  orderDirection: asc
                ) {
                  id
                  timestamp
                  amountInQuoteToken
                  payoutInPayoutToken
                  marketId
                }
              }
            `,
            (d) => d.bondPurchases as BondPurchaseRow[] | undefined,
          );

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

      // Current weekly yield is the latest deduped week's yield
      const currentWeeklyYield =
        weeklyYields.length > 0 ? weeklyYields[weeklyYields.length - 1].yieldDeployed : 0;

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
