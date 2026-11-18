import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTreasuryHistory } from "../useTreasuryHistory";

const { getDailyMetrics } = vi.hoisted(() => ({ getDailyMetrics: vi.fn() }));
vi.mock("@/lib/treasury-subgraph-client", () => ({
  treasurySubgraphClient: { getDailyMetrics },
}));
vi.mock("@tanstack/react-query", () => ({ useQuery: (options: unknown) => options }));

async function query() {
  // biome-ignore lint/correctness/useHookAtTopLevel: useQuery is mocked to expose its query function.
  const options = useTreasuryHistory() as unknown as { queryFn: () => Promise<unknown> };
  return options.queryFn();
}

const row = {
  date: "2026-11-18",
  crossChainComplete: true,
  ohmBackedSupply: 100,
  treasuryMarketValue: 1500,
  treasuryLiquidBackingPerOhmBacked: 11.96,
  ohmPrice: 15.68,
  treasuryMarketValueRecords: {
    Ethereum: [
      { value: 1000, valueExcludingOhm: 1000, isLiquid: true },
      { value: 499, valueExcludingOhm: 196, isLiquid: true },
    ],
    Berachain: [{ value: 1, valueExcludingOhm: 1, isLiquid: false }],
  },
};

beforeEach(() => vi.clearAllMocks());

describe("Pulse total backing", () => {
  it("excludes OHM value, retains LP counterassets and illiquid backing, and preserves supply", async () => {
    getDailyMetrics.mockResolvedValue([row, { ...row, crossChainComplete: false }]);
    expect(await query()).toEqual([
      {
        date: row.date,
        totalBackingPerOhm: 11.97,
        liquidBackingPerOhm: 11.96,
        ohmPrice: 15.68,
        backedSupply: 100,
      },
    ]);
    expect(getDailyMetrics).toHaveBeenCalledWith(
      expect.objectContaining({ includeRecords: true, autoPaginate: true }),
    );
  });

  it("does not fall back to gross market value when records are missing", async () => {
    getDailyMetrics.mockResolvedValue([{ ...row, treasuryMarketValueRecords: undefined }]);
    await expect(query()).rejects.toThrow("Treasury asset records are required");
  });

  it("handles zero backed supply", async () => {
    getDailyMetrics.mockResolvedValue([{ ...row, ohmBackedSupply: 0 }]);
    expect(await query()).toEqual([expect.objectContaining({ totalBackingPerOhm: 0 })]);
  });
});
