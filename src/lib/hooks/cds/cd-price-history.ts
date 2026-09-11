/**
 * The route caps EACH of its three collections at 1000 rows and offers no
 * cursor — only the `from`/`to` window it already takes. Left unpaged, the
 * "all" range silently truncates: against the deployed indexer today
 * `depositPeriodSnapshots` stops in February while bids run to September, so
 * the chart drew seven months of tick history that simply was not there.
 *
 * So the window itself is the cursor. Each pass advances `from` to the EARLIEST
 * last timestamp among the collections that came back FULL — past that point at
 * least one collection still has rows to give. Collections that were not full
 * are already complete for the window and merely repeat on the next pass;
 * deduping by `id` drops those repeats, and also covers the rows that share the
 * boundary timestamp (the reason the cursor cannot simply be `last + 1`).
 */
import {
  getConvertibleDepositsPriceHistory,
  type GetConvertibleDepositsPriceHistory200Data,
} from "@/generated/indexer";

const PAGE_LIMIT = 1000;

type PriceHistory = GetConvertibleDepositsPriceHistory200Data;

/**
 * Appends the rows not already seen, and reports the timestamp to resume from
 * when this collection filled its page.
 */
function collect<T extends { id: string; timestamp: string }>(
  rows: T[],
  seen: Set<string>,
  into: T[],
): number | undefined {
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    into.push(row);
  }
  if (rows.length < PAGE_LIMIT) return undefined;
  return Number(rows[rows.length - 1].timestamp);
}

export async function fetchAllPriceHistory(query: {
  from?: string;
  depositPeriod?: string;
}): Promise<PriceHistory> {
  const merged: PriceHistory = { bids: [], auctioneerSnapshots: [], depositPeriodSnapshots: [] };
  const seenBids = new Set<string>();
  const seenAuctioneer = new Set<string>();
  const seenDepositPeriod = new Set<string>();
  let from = query.from;

  for (;;) {
    const { data } = await getConvertibleDepositsPriceHistory({
      ...query,
      from,
      limit: PAGE_LIMIT,
    });

    const resumeFrom = [
      collect(data.bids, seenBids, merged.bids),
      collect(data.auctioneerSnapshots, seenAuctioneer, merged.auctioneerSnapshots),
      collect(data.depositPeriodSnapshots, seenDepositPeriod, merged.depositPeriodSnapshots),
    ].filter((timestamp): timestamp is number => timestamp !== undefined);

    // Nothing filled its page, so the window is exhausted.
    if (resumeFrom.length === 0) return merged;

    const next = Math.min(...resumeFrom);
    // The cursor is inclusive, so a page that ends where it began cannot be
    // advanced past — more than PAGE_LIMIT rows share a single timestamp, and
    // the fix is a cursor on the route rather than a larger constant here.
    if (from !== undefined && next <= Number(from)) {
      throw new Error(
        `CD price history stalled at timestamp ${next}: over ${PAGE_LIMIT} rows share it`,
      );
    }
    from = String(next);
  }
}
