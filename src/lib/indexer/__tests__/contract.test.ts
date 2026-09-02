// Contract tests against a DEPLOYED protocol indexer.
//
// The hooks in this repo are typed against shapes the API promises. Nothing
// else here checks that promise — a field renamed upstream would typecheck
// locally and break the UI at runtime. These tests make the requests the hooks
// make and assert the fields they read.
//
//   INDEXER_API_URL=https://<api-host> pnpm test
//
// Skipped without INDEXER_API_URL, so the normal suite stays offline.

import { describe, expect, test } from "vitest";

const API = process.env.INDEXER_API_URL?.replace(/\/+$/, "");

async function get(path: string): Promise<{ data: unknown; meta: { block: number } }> {
  const response = await fetch(`${API}${path}`);
  expect(response.status, path).toBe(200);
  return response.json();
}

describe.skipIf(!API)("governance hooks' contract with the indexer", () => {
  test("useProposals: rows carry every field normalizeProposal reads", async () => {
    const { data, meta } = await get("/v1/governor/proposals?limit=1");
    const rows = data as Record<string, unknown>[];
    expect(rows.length).toBeGreaterThan(0);
    for (const field of [
      "proposalId",
      "proposer",
      "targets",
      "signatures",
      "calldatas",
      "transactionHash",
      "description",
      "blockTimestamp",
      "blockNumber",
      "startBlock",
      "values",
    ]) {
      expect(rows[0], field).toHaveProperty(field);
    }
    // Freshness is observable rather than assumed — this is why the envelope exists.
    expect(typeof meta.block).toBe("number");
  });

  test("useProposal: a single proposal resolves by id", async () => {
    const { data } = await get("/v1/governor/proposals?limit=1");
    const id = (data as { proposalId: string }[])[0].proposalId;
    const single = (await get(`/v1/governor/proposals/${id}`)).data as { proposalId: string };
    expect(single.proposalId).toBe(id);
  });

  test("useProposalTimeline: all four markers come back in one request", async () => {
    const { data } = await get("/v1/governor/proposals/10/timeline");
    expect(Object.keys(data as object).sort()).toEqual([
      "canceled",
      "executed",
      "queued",
      "vetoed",
    ]);
  });

  test("useProposalVotes: votes carry the voter and are ordered heaviest first", async () => {
    const { data } = await get("/v1/governor/votes?proposalId=10&support=1&limit=5");
    const votes = data as { votes: string; voter: { address: string }; support: number }[];
    expect(votes.length).toBeGreaterThan(0);
    expect(votes[0].voter.address).toMatch(/^0x[0-9a-f]{40}$/);
    const weights = votes.map((v) => Number.parseFloat(v.votes));
    expect([...weights].sort((a, b) => b - a)).toEqual(weights);
  });

  test("useProposalVoterCount: id-ordered pages give a stable cursor", async () => {
    const { data } = await get("/v1/governor/votes?proposalId=10&orderBy=id&order=asc&limit=3");
    const page = data as { id: string }[];
    expect(page.length).toBeGreaterThan(0);
    const ids = page.map((v) => v.id);
    expect([...ids].sort()).toEqual(ids);

    const next = (
      await get(
        `/v1/governor/votes?proposalId=10&orderBy=id&order=asc&limit=3&sinceId=${encodeURIComponent(ids[ids.length - 1])}`,
      )
    ).data as { id: string }[];
    // The cursor is exclusive; a page must never repeat the row it resumed from.
    expect(next.map((v) => v.id)).not.toContain(ids[ids.length - 1]);
  });

  test("useDelegates: voting power, delegators, and the dust floor", async () => {
    const { data } = await get("/v1/governor/delegates?minVotingPower=0.0001&limit=5");
    const delegates = data as {
      address: string;
      latestVotingPowerSnapshot: { votingPower: string };
      delegators: { id: string }[];
    }[];
    expect(delegates.length).toBeGreaterThan(0);
    for (const delegate of delegates) {
      expect(Number.parseFloat(delegate.latestVotingPowerSnapshot.votingPower)).toBeGreaterThan(
        0.0001,
      );
      expect(Array.isArray(delegate.delegators)).toBe(true);
    }
  });

  test("useDelegate: a single delegate carries votesCasted", async () => {
    const { data } = await get("/v1/governor/delegates?limit=1");
    const address = (data as { address: string }[])[0].address;
    const delegate = (await get(`/v1/governor/delegates/${address}`)).data as {
      votesCasted: { proposalId: string; support: number }[];
    };
    expect(Array.isArray(delegate.votesCasted)).toBe(true);
  });
});

describe.skipIf(!API)("cooler hooks' contract with the indexer", () => {
  test("useCoolerMetrics: liveness carries snapshots and MonoCooler in one response", async () => {
    const { data } = await get("/v1/cooler/liveness");
    const liveness = data as {
      snapshots: { clearinghouse: { id: string }; principalReceivables: string }[];
      monocooler: { totalDebt: string; interestRateWad: string } | null;
    };
    expect(liveness.snapshots.length).toBeGreaterThan(0);
    expect(liveness.snapshots[0].clearinghouse.id).toMatch(/^0x[0-9a-f]{40}$/);
    // v1 receivables are human-readable decimals; MonoCooler is WAD. The hook
    // divides one and not the other, so a change here is a 1e18 error in the UI.
    expect(Number.parseFloat(liveness.snapshots[0].principalReceivables)).toBeLessThan(1e12);
    if (liveness.monocooler) {
      expect(Number.parseFloat(liveness.monocooler.totalDebt)).toBeGreaterThan(1e18);
    }
  });

  test("useTopBorrow: loans can be ordered by principal", async () => {
    const { data } = await get("/v1/cooler/loans?orderBy=principal&order=desc&limit=2");
    const loans = data as { principal: string }[];
    expect(loans.length).toBe(2);
    expect(Number.parseFloat(loans[0].principal)).toBeGreaterThanOrEqual(
      Number.parseFloat(loans[1].principal),
    );
  });

  test("useActiveLoans / useDefaultedLoans: both lists come from one route", async () => {
    const active = (await get("/v1/cooler/loans?minPrincipal=0&limit=2")).data as {
      principal: string;
    }[];
    for (const loan of active) expect(Number.parseFloat(loan.principal)).toBeGreaterThan(0);

    const defaulted = (await get("/v1/cooler/loans?defaulted=true&limit=2")).data as {
      defaultedClaimEvents: unknown[];
    }[];
    for (const loan of defaulted) expect(loan.defaultedClaimEvents.length).toBeGreaterThan(0);
  });

  test("useProtocolIncome: three legacy collections arrive grouped", async () => {
    const { data } = await get("/v1/cooler/daily/protocol-income?limit=2");
    expect(Object.keys(data as object).sort()).toEqual(["defaults", "extensions", "repayments"]);
  });

  test("useUtilization: daily snapshots keep the legacy microsecond timestamp", async () => {
    const { data } = await get("/v1/cooler/daily/clearinghouse-snapshots?limit=1");
    const row = (data as { timestamp: string; clearinghouse: { address: string } }[])[0];
    // formatDate() divides by 1000 to reach milliseconds. Seconds here would
    // silently move every point on the utilisation chart.
    expect(Number(row.timestamp)).toBeGreaterThan(1e15);
    expect(row.clearinghouse.address).toMatch(/^0x[0-9a-f]{40}$/);
  });

  test("useV2AtRiskAccounts: the health-factor threshold is WAD", async () => {
    const { data } = await get(
      "/v1/cooler/monocooler/accounts?maxHealthFactor=1200000000000000000&limit=3",
    );
    const accounts = data as { healthFactor: string }[];
    for (const account of accounts) {
      expect(Number.parseFloat(account.healthFactor)).toBeLessThan(1.2e18);
    }
  });
});

describe.skipIf(!API)("convertible-deposit hooks' contract with the indexer", () => {
  test("useCdStatistics: the three singletons arrive together", async () => {
    const { data } = await get("/v1/convertible-deposits/statistics");
    expect(Object.keys(data as object).sort()).toEqual([
      "auctioneerSnapshot",
      "facilitySnapshot",
      "redemptionConfig",
    ]);
  });

  test("useHistoricalPriceData: three lists in one request, with the right primitive types", async () => {
    const { data } = await get("/v1/convertible-deposits/price-history?limit=2");
    const history = data as {
      bids: { timestamp: string; depositPeriod: number; tickPriceDecimal: string }[];
      auctioneerSnapshots: { isAuctionActive: boolean }[];
      depositPeriodSnapshots: unknown[];
    };
    expect(Object.keys(history).sort()).toEqual([
      "auctioneerSnapshots",
      "bids",
      "depositPeriodSnapshots",
    ]);
    // The hook converts the timestamp and the `*Decimal` fields but NOT
    // depositPeriod or isAuctionActive — they must already be primitives.
    if (history.bids.length > 0) {
      expect(typeof history.bids[0].timestamp).toBe("string");
      expect(typeof history.bids[0].depositPeriod).toBe("number");
      expect(typeof history.bids[0].tickPriceDecimal).toBe("string");
    }
    if (history.auctioneerSnapshots.length > 0) {
      expect(typeof history.auctioneerSnapshots[0].isAuctionActive).toBe("boolean");
    }
  });

  test("useStatisticsData: every windowed list accepts sinceTimestamp and asc order", async () => {
    for (const path of [
      "facility-snapshots",
      "bids",
      "auctioneer-snapshots",
      "converted-deposits",
      "claimed-yields",
    ]) {
      const { data } = await get(
        `/v1/convertible-deposits/${path}?sinceTimestamp=1&order=asc&limit=2`,
      );
      expect(Array.isArray(data), path).toBe(true);
    }
  });
});

describe.skipIf(!API)("yrf and emission-manager hooks' contract with the indexer", () => {
  test("useEmissionManager: four roots in one response", async () => {
    const { data } = await get("/v1/emission-manager/pulse");
    const pulse = data as { state: { activeMarketId: string } | null };
    expect(Object.keys(data as object).sort()).toEqual([
      "activation",
      "backingUpdates",
      "deactivation",
      "state",
    ]);
    // schema.graphql declares activeMarketId non-null; the hook assigns it
    // straight to a `string` field.
    if (pulse.state) expect(typeof pulse.state.activeMarketId).toBe("string");
  });

  test("useYrfHistory: id-ordered cursors are stable", async () => {
    for (const path of ["/v1/yrf/next-yield-sets", "/v1/yrf/repo-markets"]) {
      const { data } = await get(`${path}?orderBy=id&order=asc&limit=3`);
      const ids = (data as { id: string }[]).map((row) => row.id);
      expect([...ids].sort(), path).toEqual(ids);
    }
  });

  // YRF has ~700 markets and the filter is capped, so the hook chunks. Passing
  // them all is a 400, not a silent truncation — worth pinning both halves.
  test("useYrfHistory: the marketIds filter is bounded, and the bound is 200", async () => {
    const markets = (await get("/v1/yrf/repo-markets?limit=1000")).data as {
      marketId: string;
    }[];
    expect(markets.length).toBeGreaterThan(200);

    const ids = markets
      .slice(0, 200)
      .map((m) => m.marketId)
      .join(",");
    const response = await fetch(`${API}/v1/bonds/purchases?marketIds=${ids}&limit=5`);
    expect(response.status).toBe(200);

    const tooMany = markets
      .slice(0, 201)
      .map((m) => m.marketId)
      .join(",");
    const rejected = await fetch(`${API}/v1/bonds/purchases?marketIds=${tooMany}&limit=5`);
    expect(rejected.status).toBe(400);
  });
});

describe.skipIf(!API)("the redemptions payload shape", () => {
  // This route is the one that does NOT return a bare array, and the exposure
  // helper iterates what it is given. A shape assertion here is the difference
  // between a caught contract change and a TypeError in the Pulse card.
  test("returns an object of two flat lists, not an array", async () => {
    const { data } = await get("/v1/convertible-deposits/redemptions?limit=5");
    expect(Array.isArray(data)).toBe(false);
    const payload = data as { redemptions: unknown[]; loans: unknown[] };
    expect(Array.isArray(payload.redemptions)).toBe(true);
    expect(Array.isArray(payload.loans)).toBe(true);
  });

  test("loans join to redemptions on the composite id, not redemptionId", async () => {
    const { data } = await get("/v1/convertible-deposits/redemptions?limit=1000");
    const payload = data as {
      redemptions: { id: string; redemptionId: number }[];
      loans: { id: string }[];
    };

    // Every loan id must be a redemption id — that is what makes the join exact.
    const redemptionIds = new Set(payload.redemptions.map((r) => r.id));
    const unmatched = payload.loans.filter((loan) => !redemptionIds.has(loan.id));
    expect(unmatched).toEqual([]);

    // And redemptionId is NOT unique, which is why it cannot be the key.
    const distinct = new Set(payload.redemptions.map((r) => r.redemptionId));
    expect(distinct.size).toBeLessThan(payload.redemptions.length);
  });
});
