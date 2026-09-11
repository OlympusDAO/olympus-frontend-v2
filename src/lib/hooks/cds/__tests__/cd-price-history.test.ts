import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAllPriceHistory } from "@/lib/hooks/cds/cd-price-history";

const getPriceHistory = vi.hoisted(() => vi.fn());

vi.mock("@/generated/indexer", () => ({
  getConvertibleDepositsPriceHistory: getPriceHistory,
}));

const PAGE_LIMIT = 1000;

/** `count` rows carrying sequential ids and timestamps, starting at `from`. */
const rows = (prefix: string, from: number, count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${from + i}`,
    timestamp: String(from + i),
  }));

const page = (
  bids: unknown[] = [],
  auctioneerSnapshots: unknown[] = [],
  depositPeriodSnapshots: unknown[] = [],
) => ({ data: { bids, auctioneerSnapshots, depositPeriodSnapshots } });

describe("fetchAllPriceHistory", () => {
  beforeEach(() => getPriceHistory.mockReset());

  it("returns a short response without a second request", async () => {
    getPriceHistory.mockResolvedValueOnce(page(rows("bid", 100, 3), rows("auc", 100, 2)));

    const history = await fetchAllPriceHistory({});

    expect(getPriceHistory).toHaveBeenCalledTimes(1);
    expect(history.bids).toHaveLength(3);
    expect(history.auctioneerSnapshots).toHaveLength(2);
    expect(history.depositPeriodSnapshots).toEqual([]);
  });

  // The bug this exists for: `depositPeriodSnapshots` filled its page and
  // stopped in February while bids ran to September, and the chart drew the
  // gap as if it were real.
  it("keeps paging while any one collection fills its page", async () => {
    getPriceHistory
      .mockResolvedValueOnce(page(rows("bid", 1, 5), [], rows("dps", 1, PAGE_LIMIT)))
      .mockResolvedValueOnce(page([], [], rows("dps", PAGE_LIMIT, 7)));

    const history = await fetchAllPriceHistory({});

    expect(getPriceHistory).toHaveBeenCalledTimes(2);
    expect(history.depositPeriodSnapshots).toHaveLength(PAGE_LIMIT + 6);
    // The window resumes AT the last timestamp, so the boundary row comes back
    // a second time and must not be counted twice.
    expect(new Set(history.depositPeriodSnapshots.map((r) => r.id)).size).toBe(PAGE_LIMIT + 6);
    expect(history.bids).toHaveLength(5);
  });

  it("resumes from the earliest full collection so no collection is skipped", async () => {
    getPriceHistory
      .mockResolvedValueOnce(page([], rows("auc", 1, PAGE_LIMIT), rows("dps", 1, PAGE_LIMIT)))
      .mockResolvedValueOnce(page([], rows("auc", PAGE_LIMIT, 4), rows("dps", PAGE_LIMIT, 4)));

    await fetchAllPriceHistory({ from: "1" });

    // Both filled at timestamp 1000, so that is where the next window opens.
    expect(getPriceHistory).toHaveBeenLastCalledWith({ from: "1000", limit: PAGE_LIMIT });
  });

  it("passes the caller's window and deposit period through", async () => {
    getPriceHistory.mockResolvedValueOnce(page());

    await fetchAllPriceHistory({ from: "500", depositPeriod: "7" });

    expect(getPriceHistory).toHaveBeenCalledWith({
      from: "500",
      depositPeriod: "7",
      limit: PAGE_LIMIT,
    });
  });

  it("throws rather than looping when a page cannot advance", async () => {
    // Every row shares one timestamp, so the window can never move past it.
    const stuck = Array.from({ length: PAGE_LIMIT }, (_, i) => ({
      id: `auc-${i}`,
      timestamp: "42",
    }));
    getPriceHistory.mockResolvedValue(page([], stuck));

    await expect(fetchAllPriceHistory({ from: "42" })).rejects.toThrow(/stalled at timestamp 42/);
  });
});
