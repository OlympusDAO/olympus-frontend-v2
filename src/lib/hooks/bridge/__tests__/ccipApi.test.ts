import { afterEach, describe, expect, it, vi } from "vitest";
import type { Address, Hex } from "viem";
import fixture from "./fixtures/ccip-messages.json";
import {
  fetchBridgeMessages,
  fetchMessage,
  filterByOrigin,
  filterByWallet,
  onBridgeChains,
  getCcipAmount,
  type CcipMessage,
} from "../ccipApi";

const BRIDGE = "0x00000000000000000000000000000000000000a1" as Address;
const SELECTOR = 5009297550715157269n;
const real = fixture.data[0] as unknown as CcipMessage;

function respondWith(...pages: unknown[]) {
  const fetchMock = vi.fn();
  for (const page of pages) {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => page });
  }
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const page = (data: unknown[], cursor: string | null) => ({
  data,
  pagination: { hasNextPage: cursor !== null, cursor },
});

afterEach(() => vi.unstubAllGlobals());

describe("fetchBridgeMessages", () => {
  it("queries by bridge and source selector", async () => {
    const fetchMock = respondWith(page([real], null));
    await fetchBridgeMessages(BRIDGE, SELECTOR);

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe("https://api.ccip.chain.link/v2/messages");
    expect(url.searchParams.get("sender")).toBe(BRIDGE);
    expect(url.searchParams.get("sourceChainSelector")).toBe(SELECTOR.toString());
  });

  it("follows the cursor across pages", async () => {
    const fetchMock = respondWith(page([real], "next"), page([real], null));
    const messages = await fetchBridgeMessages(BRIDGE, SELECTOR);

    expect(messages).toHaveLength(2);
    expect(new URL(fetchMock.mock.calls[1][0]).searchParams.get("cursor")).toBe("next");
  });

  it("stops at the page cap", async () => {
    const fetchMock = respondWith(page([real], "a"), page([real], "b"), page([real], "c"));
    const messages = await fetchBridgeMessages(BRIDGE, SELECTOR, { maxPages: 2 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(messages).toHaveLength(2);
  });

  it("throws on a non-2xx response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(fetchBridgeMessages(BRIDGE, SELECTOR)).rejects.toThrow("500");
  });
});

describe("fetchMessage", () => {
  it("requests the message by ID", async () => {
    const fetchMock = respondWith(real);
    const id = real.messageId as Hex;

    await expect(fetchMessage(id)).resolves.toEqual(real);
    expect(fetchMock.mock.calls[0][0]).toBe(`https://api.ccip.chain.link/v2/messages/${id}`);
  });
});

describe("filterByOrigin", () => {
  it("matches the wallet regardless of address case", () => {
    const wallet = real.origin.toLowerCase() as Address;
    const other = { ...real, origin: "0x00000000000000000000000000000000000000ff" };
    expect(filterByOrigin([real, other], wallet)).toEqual([real]);
  });
});

describe("getCcipAmount", () => {
  it("formats the OHM amount from a real response shape", () => {
    expect(
      getCcipAmount({
        ...real,
        sourceTokenAmount: { tokenAddress: "0x1", tokenAmount: "1500000000" },
      }),
    ).toBe("1.5");
  });

  it("is undefined when the API has no token amount", () => {
    expect(getCcipAmount({ ...real, sourceTokenAmount: null })).toBeUndefined();
  });
});

describe("onBridgeChains", () => {
  it("drops messages to chains the UI doesn't support, like Solana", () => {
    const solana = {
      ...real,
      destNetworkInfo: {
        chainId: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
        chainSelector: "124615329519749607",
      },
    };
    expect(onBridgeChains([real, solana])).toEqual([real]);
  });
});

describe("filterByWallet", () => {
  const wallet = "0x00000000000000000000000000000000000000c1" as Address;

  it("matches a Safe's message by its execution hash, as its origin is the executor", () => {
    const other = { ...real, sendTransactionHash: "0xother" };
    const hashes = new Set([real.sendTransactionHash.toLowerCase()]);
    expect(filterByWallet([real, other], wallet, hashes)).toEqual([real]);
  });

  it("still matches by origin", () => {
    const signed = { ...real, origin: wallet };
    expect(filterByWallet([signed], wallet, new Set())).toEqual([signed]);
  });
});
