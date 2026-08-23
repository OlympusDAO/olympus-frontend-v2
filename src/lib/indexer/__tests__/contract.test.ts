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
